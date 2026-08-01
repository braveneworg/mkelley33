/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { connect } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

// mongodb-memory-server pipes mongod's stdout/stderr into THIS process and
// relies on our event loop to drain them. Every child step must therefore
// run via async spawn: a spawnSync would block the loop, the ~64KB pipe
// buffer fills during mongod's log bursts, and mongod blocks mid-operation
// — the client then sits on established-but-silent connections forever.
// Hard step timeouts plus a fresh-mongod retry guard the setup against any
// residual environmental flakes. Seeding uses fail-fast driver params so a
// real connection failure surfaces quickly; build/serve keep the patient
// params scripts/ci-build.mjs documents for prerender freezes.
const SETUP_ATTEMPTS = 3;
const FAST_PARAMS = 'connectTimeoutMS=15000&serverSelectionTimeoutMS=15000';
const PATIENT_PARAMS = 'connectTimeoutMS=120000&serverSelectionTimeoutMS=120000';
const STEP_TIMEOUT_MS = 240_000;
const BUILD_TIMEOUT_MS = 1_500_000;

// Dedicated E2E port — never Next's default 3000. On 3000 a developer's
// `pnpm dev` (often backed by a real database) could already be listening:
// `next start` would die with EADDRINUSE into e2e-server.log while the
// readiness probes pass against the FOREIGN server and the suite writes to
// it. A dedicated port plus the assertPortFree guard below makes that
// impossible: the suite only ever talks to the server this harness spawned.
const E2E_PORT = 4310;
const BASE_URL = `http://localhost:${E2E_PORT}`;

// Hermetic env: the suite must never touch a developer database or real
// third-party services, so every env-sensitive key is pinned here. Seeding
// runs via `pnpm exec tsx` (not the package.json scripts) so .env.local is
// never loaded; `next build`/`next start` load it on their own, but
// explicit process env always wins over env files.
const makeEnv = (uri, params) => ({
  ...process.env,
  // Truthiness-gated in payload.config.ts — '' keeps the plugin off.
  BLOB_READ_WRITE_TOKEN: '',
  DATABASE_URL: `${uri}?${params}`,
  // Lets the newsletter spec scrape the confirm link from e2e-server.log —
  // without this opt-in the JSON transport never logs message content.
  EMAIL_LOG_UNSENT: 'true',
  // Cloudflare's official always-pass Turnstile test keys (public values,
  // already hardcoded as the dev/CI fallback in src/lib/turnstile.ts).
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  PAYLOAD_SECRET: 'e2e-secret',
  // '' forces the JSON transport so no real email can ever leave the suite.
  SMTP_HOST: '',
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
});

/**
 * Kill a spawned child's whole process group (children spawn detached, so
 * each leads its own group). Killing only the direct child (pnpm) would
 * orphan its grandchildren (tsx/next) — they must die with it.
 */
const killGroup = (child, signal) => {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The group is already gone.
  }
};

/** Async spawn (never spawnSync — see the pipe-drain note above). */
const runCommand = (args, env, timeout) =>
  new Promise((resolve) => {
    const child = spawn('pnpm', args, { detached: true, env, stdio: 'inherit' });
    const timer = timeout
      ? setTimeout(() => {
          killGroup(child, 'SIGKILL');
        }, timeout)
      : null;
    child.on('close', (code, signal) => {
      if (timer) {
        clearTimeout(timer);
      }
      resolve({ code, signal });
    });
  });

/** True when something accepts TCP connections on host:E2E_PORT. */
const portInUse = (host) =>
  new Promise((resolve) => {
    const socket = connect({ host, port: E2E_PORT });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });

/**
 * Hermeticity guard: abort when ANYTHING already listens on the E2E port
 * (either loopback family) — the suite must never probe, let alone write
 * to, a server this harness did not spawn.
 */
const assertPortFree = async () => {
  const inUse = await Promise.all([portInUse('127.0.0.1'), portInUse('::1')]);
  if (inUse.some(Boolean)) {
    console.error(
      `[e2e] port ${E2E_PORT} is already in use — refusing to run against a ` +
        'server this harness did not spawn. Stop the listener and re-run.'
    );
    return false;
  }
  return true;
};

const runStep = async (label, args, env, timeout) => {
  console.info(`[e2e] ${label}`);
  const { code, signal } = await runCommand(args, env, timeout);
  if (code === 0) {
    return true;
  }
  const reason = signal ? `killed (${signal}) after timeout` : `failed (status ${code})`;
  console.error(`[e2e] ${label} ${reason}`);
  return false;
};

// Seed BEFORE building: every page uses ISR (`revalidate = 300`), so a build
// against an empty database would bake empty services into the prerendered
// HTML and serve that stale markup to the specs' first visit.
const setUp = async () => {
  for (let attempt = 1; attempt <= SETUP_ATTEMPTS; attempt += 1) {
    const mongod = await MongoMemoryServer.create({
      instance: { args: ['--wiredTigerCacheSizeGB', '0.25'] },
    });
    const uri = mongod.getUri();
    const fastEnv = makeEnv(uri, FAST_PARAMS);
    const done =
      (await runStep(
        'seed:services',
        ['exec', 'tsx', 'scripts/seed-services.ts'],
        fastEnv,
        STEP_TIMEOUT_MS
      )) && (await runStep('build', ['build'], makeEnv(uri, PATIENT_PARAMS), BUILD_TIMEOUT_MS));
    if (done) {
      return mongod;
    }
    await mongod.stop();
    console.error(
      `[e2e] setup attempt ${attempt}/${SETUP_ATTEMPTS} failed${
        attempt < SETUP_ATTEMPTS ? ' — retrying with a fresh mongod' : ''
      }`
    );
  }
  return null;
};

const pollUntilOk = async (url, tries) => {
  for (let i = 0; i < tries; i += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not accepting connections yet (or the request timed out).
    }
    await sleep(1000);
  }
  return false;
};

// Fail fast before paying for mongod + seed + build.
if (!(await assertPortFree())) {
  process.exit(1);
}

const mongod = await setUp();
if (!mongod) {
  process.exit(1);
}

let status;
let server;
try {
  // The build above can run for many minutes — re-check right before
  // binding so a listener that appeared meanwhile is caught too.
  if (!(await assertPortFree())) {
    status = 1;
  } else {
    server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(E2E_PORT)], {
      detached: true,
      env: makeEnv(mongod.getUri(), PATIENT_PARAMS),
    });
    const log = createWriteStream('e2e-server.log');
    server.stdout.pipe(log);
    server.stderr.pipe(log);
    const staticReady = await pollUntilOk(BASE_URL, 90);
    // A DB-backed route proves the server's mongo pool actually works — the
    // home page alone can serve prerendered HTML with a wedged pool behind
    // it. The token is a deliberately NON-hex sentinel: the route treats any
    // unknown token as invalid (still exercising the DB lookup), and a
    // non-hex value can never match the newsletter spec's [0-9a-f]{64}
    // scrape regex over e2e-server.log if the probe URL ever gets logged.
    const dbReady =
      staticReady &&
      (await pollUntilOk(`${BASE_URL}/newsletter/confirm?token=${'z'.repeat(64)}`, 60));
    if (dbReady) {
      const pw = await runCommand(
        ['exec', 'playwright', 'test'],
        { ...makeEnv(mongod.getUri(), PATIENT_PARAMS), E2E_BASE_URL: BASE_URL },
        null
      );
      status = pw.code ?? 1;
    } else {
      // No process.exit here — it would skip the finally and leak children.
      console.error('[e2e] server never became ready (static and DB-backed checks)');
      status = 1;
    }
  }
} finally {
  if (server) {
    killGroup(server, 'SIGKILL');
  }
  await mongod.stop();
}
process.exit(status ?? 1);
