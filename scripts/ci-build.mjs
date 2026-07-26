import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

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
function runBuild(uri) {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['build'], {
      env: {
        ...process.env,
        DATABASE_URL: `${uri}?${DRIVER_PARAMS}`,
        PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
      },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    const tee = (source, sink) => {
      source.on('data', (chunk) => {
        output += chunk;
        sink.write(chunk);
      });
    };
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);

    child.on('error', (error) => resolve({ output, status: 1, spawnError: error }));
    child.on('close', (code) => resolve({ output, status: code ?? 1 }));
  });
}

let status = 1;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const mongod = await MongoMemoryServer.create({
    instance: { args: ['--wiredTigerCacheSizeGB', '0.25'] },
  });
  let result;
  try {
    result = await runBuild(mongod.getUri());
  } finally {
    await mongod.stop();
  }

  status = result.status;
  if (result.spawnError) {
    console.error(`build:ci could not spawn the build: ${result.spawnError.message}`);
  }

  // A green exit is not enough: the build must also have reached the database.
  if (status === 0 && DB_UNREACHABLE.test(result.output)) {
    status = 1;
    console.error(
      'build:ci: the build exited 0 but Payload never reached mongod — every ' +
        'database-backed route prerendered empty. Failing instead of shipping ' +
        'a site with no content.'
    );
  }

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
  status = 1;
  console.error(
    `build:ci: the build succeeded but ${SERVICE_WORKER} was not emitted — the ` +
      'serwist step did not run, so the PWA would ship without a service worker.'
  );
}

process.exit(status);
