/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * `pnpm build` against a throwaway mongod, with the two checks a green exit
 * cannot give on its own: that the build actually reached the database, and
 * that the service worker was emitted. Runs under tsx so it can share
 * `@/lib/proc/run-child` with the E2E harness — the same async spawn, the
 * same `error` listener, the same capture.
 */

import { existsSync } from 'node:fs';

import { MongoMemoryServer } from 'mongodb-memory-server';

import { runChild, type ChildResult } from '@/lib/proc/run-child';

// Cold Turbopack builds intermittently hang forever while prerendering the
// heavy Payload routes (/blog, /feed.xml) — connections to mongod sit idle
// and every in-process attempt times out (known Next 16 build-hang class;
// `next build --webpack` is the upstream escape hatch if this worsens).
// Attempt 1 leaves a warm .next cache, and a fresh `pnpm build` then renders
// those routes instantly, so one full retry is the effective mitigation.
const MAX_ATTEMPTS = 2;

// Prerender workers can freeze >30s on cold-cache module evaluation; give the
// driver timeouts that outlast the freeze so connections survive it.
const DRIVER_PARAMS = 'connectTimeoutMS=120000&serverSelectionTimeoutMS=120000';

// The repositories swallow database failures and render empty (see
// listPublishedPosts) so a transient blip can't take a page down. That is the
// right call at request time and the wrong one at build time: without this
// guard a build that never reached mongod prerenders a postless site, emits a
// service worker precaching that empty output, and still exits 0.
const DB_UNREACHABLE = /cannot connect to MongoDB|payloadInitError/;

// `pnpm build` runs `next build && serwist build`; a missing worker means the
// serwist step silently dropped out of the pipeline.
const SERVICE_WORKER = 'public/sw.js';

/** Runs the build, streaming output through while retaining it for inspection. */
const runBuild = (uri: string): Promise<ChildResult> =>
  runChild({
    args: ['build'],
    command: 'pnpm',
    env: {
      ...process.env,
      DATABASE_URL: `${uri}?${DRIVER_PARAMS}`,
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
    },
    output: 'capture',
  });

/** One build against a fresh mongod. Resolves to the exit status it earned. */
const buildOnce = async (): Promise<number> => {
  const mongod = await MongoMemoryServer.create({
    instance: { args: ['--wiredTigerCacheSizeGB', '0.25'] },
  });
  let result: ChildResult;
  try {
    result = await runBuild(mongod.getUri());
  } finally {
    await mongod.stop();
  }

  if (result.spawnError) {
    console.error(`build:ci could not spawn the build: ${result.spawnError.message}`);
  }

  // A green exit is not enough: the build must also have reached the database.
  const status = result.code ?? 1;
  if (status === 0 && DB_UNREACHABLE.test(result.output)) {
    console.error(
      'build:ci: the build exited 0 but Payload never reached mongod — every ' +
        'database-backed route prerendered empty. Failing instead of shipping ' +
        'a site with no content.'
    );
    return 1;
  }
  return status;
};

const run = async (): Promise<number> => {
  let status = 1;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    status = await buildOnce();
    if (status === 0) {
      break;
    }
    if (attempt < MAX_ATTEMPTS) {
      console.error(
        `build:ci attempt ${attempt} failed (exit ${status}) — retrying with a fresh mongod`
      );
    }
  }

  // Deterministic, so it sits outside the retry loop — a rebuild would not help.
  if (status === 0 && !existsSync(SERVICE_WORKER)) {
    console.error(
      `build:ci: the build succeeded but ${SERVICE_WORKER} was not emitted — the ` +
        'serwist step did not run, so the PWA would ship without a service worker.'
    );
    return 1;
  }
  return status;
};

run()
  .then((status) => {
    process.exit(status);
  })
  .catch((error: unknown) => {
    console.error(`build:ci failed — ${String(error)}`);
    process.exit(1);
  });
