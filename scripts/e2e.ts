/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The ONLY supported way to run the Playwright suite, and the enforcement
 * point for every invariant in `e2e/AGENTS.md`. The pure decisions — the
 * pinned hermetic env, the dedicated port, the readiness-probe token — live
 * in `@/lib/e2e/harness-config`, where a unit spec holds them to that prose.
 * The side effects are here: seeding, building, spawning, probing, teardown.
 *
 * Where it runs is `@/lib/harness/docker-harness`'s decision: on a
 * developer's machine the whole script is re-run inside the toolchain
 * container, beside a Mongo container, so neither the build nor the server
 * ever shares a filesystem with `.env.local`; on the CI runner it runs in
 * place against a Mongo container. See
 * docs/adr/0003-builds-and-e2e-run-in-docker.md.
 *
 * Every child goes through `@/lib/proc/run-child`, which has no synchronous
 * path. The steps this file starts — seed, build, server, Playwright — are
 * spawned detached, so a timeout kill reaches the whole process group. Hard
 * step timeouts plus a fresh-database retry guard the setup against
 * environmental flakes. Runs under tsx so it can import the modules above, with no
 * `--env-file` flag, so `.env.local` is never loaded into the harness.
 */

import { copyFileSync, createWriteStream, existsSync } from 'node:fs';
import { connect } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

import {
  dbProbeUrl,
  E2E_BASE_URL,
  E2E_PORT,
  FAST_DRIVER_PARAMS,
  makeEnv,
  PATIENT_DRIVER_PARAMS,
} from '@/lib/e2e/harness-config';
import { runInHarness, type HarnessContext } from '@/lib/harness/docker-harness';
import { databaseUrl } from '@/lib/harness/mongo-url';
import { runChild, startChild } from '@/lib/proc/run-child';

import { harnessDeps } from './harness-deps';

const SETUP_ATTEMPTS = 3;
const STEP_TIMEOUT_MS = 240_000;
const BUILD_TIMEOUT_MS = 1_500_000;

const SERVER_LOG = 'e2e-server.log';

// The one directory the toolchain container shares with the host (see
// docker/compose.yaml). Playwright writes its traces here.
const SHARED_RESULTS = 'test-results';

/**
 * Runs one `pnpm` step to completion, detached so a timeout kill reaches the
 * whole process group: pnpm is only the entry point, and the tsx/next
 * grandchild is what actually has to die.
 */
const runStep = async (
  label: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<boolean> => {
  console.info(`[e2e] ${label}`);
  const { code, signal, spawnError } = await runChild({
    args,
    command: 'pnpm',
    detached: true,
    env,
    output: 'inherit',
    timeoutMs,
  });
  if (code === 0) {
    return true;
  }
  // A missing binary is an ENOENT, not an exit status — reporting it as
  // "failed (status null)" would discard the one fact that says what to fix.
  const reason = spawnError
    ? `could not start — ${spawnError.message}`
    : signal
      ? `killed (${signal}) after timeout`
      : `failed (status ${code})`;
  console.error(`[e2e] ${label} ${reason}`);
  return false;
};

/** True when something accepts TCP connections on host:E2E_PORT. */
const portInUse = (host: string): Promise<boolean> =>
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
const assertPortFree = async (): Promise<boolean> => {
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

// Seed BEFORE building: the database is the only copy of Owner content
// (docs/adr/0001), so a build against an empty one has no Site settings to
// render and fails. What the build saw is also what the specs' first visit
// is served, because the pages that read the database use ISR.
//
// Resolves to the database the build was seeded and built against, or null
// when every attempt failed. The Mongo container outlives an attempt, so a
// fresh database is a new name on the same server.
const setUp = async (mongoUrl: string): Promise<null | string> => {
  for (let attempt = 1; attempt <= SETUP_ATTEMPTS; attempt += 1) {
    const uri = databaseUrl(mongoUrl, `e2e-${attempt}`);
    const done =
      // Seeding gets the fail-fast driver params so a real connection failure
      // surfaces quickly; the build keeps the patient ones.
      (await runStep(
        'seed',
        ['exec', 'tsx', 'scripts/seed.ts'],
        makeEnv(uri, FAST_DRIVER_PARAMS),
        STEP_TIMEOUT_MS
      )) &&
      (await runStep(
        'seed:e2e-post',
        ['exec', 'tsx', 'scripts/seed-e2e-post.ts'],
        makeEnv(uri, FAST_DRIVER_PARAMS),
        STEP_TIMEOUT_MS
      )) &&
      (await runStep('build', ['build'], makeEnv(uri, PATIENT_DRIVER_PARAMS), BUILD_TIMEOUT_MS));
    if (done) {
      return uri;
    }
    console.error(
      `[e2e] setup attempt ${attempt}/${SETUP_ATTEMPTS} failed${
        attempt < SETUP_ATTEMPTS ? ' — retrying with a fresh database' : ''
      }`
    );
  }
  return null;
};

const pollUntilOk = async (url: string, tries: number): Promise<boolean> => {
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

/** Serves the built app and runs the suite against it, returning an exit code. */
const serveAndTest = async (uri: string): Promise<number> => {
  // The build can run for many minutes — re-check right before binding so a
  // listener that appeared meanwhile is caught too.
  if (!(await assertPortFree())) {
    return 1;
  }
  const server = startChild({
    args: ['exec', 'next', 'start', '-p', String(E2E_PORT)],
    command: 'pnpm',
    detached: true,
    env: makeEnv(uri, PATIENT_DRIVER_PARAMS),
    // Raw pipes rather than capture: the point of this output is the log file
    // the newsletter spec scrapes the confirm link out of.
    output: 'pipe',
    stdin: 'pipe',
  });
  try {
    const log = createWriteStream(SERVER_LOG);
    server.stdout?.pipe(log);
    server.stderr?.pipe(log);
    const staticReady = await pollUntilOk(E2E_BASE_URL, 90);
    // A DB-backed route proves the server's mongo pool actually works — the
    // home page alone can serve prerendered HTML with a wedged pool behind it.
    const dbReady = staticReady && (await pollUntilOk(dbProbeUrl(E2E_BASE_URL), 60));
    if (!dbReady) {
      // No process.exit here — it would skip the teardown and leak children.
      console.error('[e2e] server never became ready (static and DB-backed checks)');
      return 1;
    }
    const playwright = await runChild({
      args: ['exec', 'playwright', 'test'],
      command: 'pnpm',
      detached: true,
      env: { ...makeEnv(uri, PATIENT_DRIVER_PARAMS), E2E_BASE_URL },
      output: 'inherit',
    });
    if (playwright.spawnError) {
      console.error(`[e2e] playwright could not start — ${playwright.spawnError.message}`);
      return 1;
    }
    return playwright.code ?? 1;
  } finally {
    server.kill('SIGKILL');
  }
};

/**
 * Inside the container the server log would vanish with it. Copying it into
 * the shared directory leaves it on the host beside Playwright's traces —
 * after the suite, because Playwright empties that directory when it starts.
 */
const keepServerLog = (mode: HarnessContext['mode']): void => {
  if (mode === 'in-container' && existsSync(SERVER_LOG)) {
    copyFileSync(SERVER_LOG, `${SHARED_RESULTS}/${SERVER_LOG}`);
  }
};

const work = async ({ mode, mongoUrl }: HarnessContext): Promise<number> => {
  // Fail fast before paying for seed + build.
  if (!(await assertPortFree())) {
    return 1;
  }
  const uri = await setUp(mongoUrl);
  if (uri === null) {
    return 1;
  }
  try {
    return await serveAndTest(uri);
  } finally {
    keepServerLog(mode);
  }
};

runInHarness({ kind: 'e2e', script: 'scripts/e2e.ts', work }, harnessDeps('[e2e]'))
  .then((status) => {
    process.exit(status);
  })
  .catch((error: unknown) => {
    console.error(`[e2e] harness failed — ${String(error)}`);
    process.exit(1);
  });
