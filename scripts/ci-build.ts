/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Seeds a throwaway Mongo container and runs `pnpm build` against it, with
 * the three checks a green exit cannot give on its own: that the build
 * actually reached the database, that the service worker was emitted, and
 * that every function bundle carrying sharp also carries the libvips it
 * loads.
 *
 * Where it runs is `@/lib/harness/docker-harness`'s decision, not this
 * file's: on a developer's machine the whole script is re-run inside the
 * toolchain container, so the build never shares a filesystem with
 * `.env.local`; on the CI runner it runs in place. See
 * docs/adr/0003-builds-and-e2e-run-in-docker.md. Runs under tsx so it can
 * share `@/lib/proc/run-child` with the E2E harness — the same async spawn,
 * the same `error` listener, the same capture.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { summarizeSharpTraces, type OutputFileTrace } from '@/lib/deploy/sharp-trace';
import { runInHarness, type HarnessContext } from '@/lib/harness/docker-harness';
import { databaseUrl } from '@/lib/harness/mongo-url';
import { runChild, type ChildResult } from '@/lib/proc/run-child';

import { harnessDeps } from './harness-deps';

// Cold Turbopack builds intermittently hang forever while prerendering the
// heavy Payload routes (/blog, /feed.xml) — connections to Mongo sit idle
// and every in-process attempt times out (known Next 16 build-hang class;
// `next build --webpack` is the upstream escape hatch if this worsens).
// Attempt 1 leaves a warm .next cache, and a fresh `pnpm build` then renders
// those routes instantly, so one full retry is the effective mitigation.
const MAX_ATTEMPTS = 2;

// Seeding takes seconds; a seed still running after this is wedged.
const SEED_TIMEOUT_MS = 240_000;

// Prerender workers can freeze >30s on cold-cache module evaluation; give the
// driver timeouts that outlast the freeze so connections survive it.
const DRIVER_PARAMS = 'connectTimeoutMS=120000&serverSelectionTimeoutMS=120000';

// The repositories swallow database failures and render empty (see
// listPublishedPosts) so a transient blip can't take a page down. That is the
// right call at request time and the wrong one at build time: without this
// guard a build that never reached Mongo prerenders a postless site, emits a
// service worker precaching that empty output, and still exits 0.
const DB_UNREACHABLE = /cannot connect to MongoDB|payloadInitError/;

// `pnpm build` runs `next build && serwist build`; a missing worker means the
// serwist step silently dropped out of the pipeline.
const SERVICE_WORKER = 'public/sw.js';

// Next writes one `*.nft.json` per server entry listing the files that entry
// needs at runtime; Vercel assembles each function bundle from them.
const BUILD_DIRECTORY = '.next';
const TRACE_SUFFIX = '.nft.json';

const traceSchema = z.object({ files: z.array(z.string()) });

const readOutputFileTraces = (): OutputFileTrace[] =>
  readdirSync(BUILD_DIRECTORY, { encoding: 'utf8', recursive: true })
    .filter((entry) => entry.endsWith(TRACE_SUFFIX))
    .map((entry) => ({
      files: traceSchema.parse(JSON.parse(readFileSync(join(BUILD_DIRECTORY, entry), 'utf8')))
        .files,
      path: entry,
    }));

/**
 * What is wrong with a build that exited 0, or null when nothing is. Every
 * check here is deterministic — a rebuild would not change the answer.
 */
const artifactProblem = (): null | string => {
  if (!existsSync(SERVICE_WORKER)) {
    return (
      `the build succeeded but ${SERVICE_WORKER} was not emitted — the ` +
      'serwist step did not run, so the PWA would ship without a service worker.'
    );
  }

  const { complete, missingLibvips } = summarizeSharpTraces(readOutputFileTraces());
  if (missingLibvips.length > 0) {
    return (
      `${missingLibvips.length} function trace(s) carry sharp's native addon without ` +
      'the libvips library it loads, so those functions would throw ' +
      'ERR_DLOPEN_FAILED at cold start on Vercel. See src/lib/deploy/sharp-trace.ts. ' +
      `First: ${missingLibvips[0]}`
    );
  }
  if (complete === 0) {
    return (
      'no function trace carries sharp at all, so the libvips check above saw ' +
      'nothing. Payload imports sharp at module scope — if that changed, retire ' +
      'this check; if the trace layout changed, repair it.'
    );
  }
  return null;
};

/** The environment both steps run in: this one's, pointed at the throwaway database. */
const databaseEnv = (uri: string): NodeJS.ProcessEnv => ({
  ...process.env,
  // Uploads stay on this machine's disk: the Seed must never write to a
  // blob store from here, whatever token the surrounding shell carries.
  BLOB_READ_WRITE_TOKEN: '',
  DATABASE_URL: `${uri}?${DRIVER_PARAMS}`,
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
});

/**
 * Fills the empty database from the Seed. The database is the only copy of
 * Owner content (docs/adr/0001), so a build against an unseeded one has
 * nothing to render and is meant to fail.
 */
const runSeed = (uri: string): Promise<ChildResult> =>
  runChild({
    args: ['exec', 'tsx', 'scripts/seed.ts'],
    command: 'pnpm',
    env: databaseEnv(uri),
    output: 'inherit',
    timeoutMs: SEED_TIMEOUT_MS,
  });

/** Runs the build, streaming output through while retaining it for inspection. */
const runBuild = (uri: string): Promise<ChildResult> =>
  runChild({ args: ['build'], command: 'pnpm', env: databaseEnv(uri), output: 'capture' });

/**
 * One seed and build against a database of its own. The Mongo container
 * outlives the attempt, so a fresh database is a new name on the same server.
 */
const buildOnce = async (mongoUrl: string, attempt: number): Promise<number> => {
  const uri = databaseUrl(mongoUrl, `build-${attempt}`);
  const seeded = await runSeed(uri);
  if (seeded.code !== 0) {
    console.error(
      `build:ci: seeding failed (exit ${String(seeded.code)}) — nothing to build from.`
    );
    return seeded.code ?? 1;
  }
  const result = await runBuild(uri);

  if (result.spawnError) {
    console.error(`build:ci could not spawn the build: ${result.spawnError.message}`);
  }

  // A green exit is not enough: the build must also have reached the database.
  const status = result.code ?? 1;
  if (status === 0 && DB_UNREACHABLE.test(result.output)) {
    console.error(
      'build:ci: the build exited 0 but Payload never reached Mongo — every ' +
        'database-backed route prerendered empty. Failing instead of shipping ' +
        'a site with no content.'
    );
    return 1;
  }
  return status;
};

const work = async ({ mongoUrl }: HarnessContext): Promise<number> => {
  let status = 1;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    status = await buildOnce(mongoUrl, attempt);
    if (status === 0) {
      break;
    }
    if (attempt < MAX_ATTEMPTS) {
      console.error(
        `build:ci attempt ${attempt} failed (exit ${status}) — retrying with a fresh database`
      );
    }
  }

  // Deterministic, so it sits outside the retry loop — a rebuild would not help.
  const problem = status === 0 ? artifactProblem() : null;
  if (problem !== null) {
    console.error(`build:ci: ${problem}`);
    return 1;
  }
  return status;
};

runInHarness({ kind: 'build', script: 'scripts/ci-build.ts', work }, harnessDeps('build:ci:'))
  .then((status) => {
    process.exit(status);
  })
  .catch((error: unknown) => {
    console.error(`build:ci failed — ${String(error)}`);
    process.exit(1);
  });
