import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawnSync } from 'node:child_process';

// Cold Turbopack builds intermittently hang forever while prerendering the
// heavy Payload routes (/blog, /feed.xml) — connections to mongod sit idle
// and every in-process attempt times out (known Next 16 build-hang class;
// `next build --webpack` is the upstream escape hatch if this worsens).
// Attempt 1 leaves a warm .next cache, and a fresh `pnpm build` then renders
// those routes instantly, so one full retry is the effective mitigation.
const MAX_ATTEMPTS = 2;

// Prerender workers can freeze >30s on cold-cache module evaluation; give the
// driver timeouts that outlast the freeze so connections survive it.
const DRIVER_PARAMS =
  'connectTimeoutMS=120000&serverSelectionTimeoutMS=120000';

function runBuild(uri) {
  return spawnSync('pnpm', ['build'], {
    env: {
      ...process.env,
      DATABASE_URL: `${uri}?${DRIVER_PARAMS}`,
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
    },
    stdio: 'inherit',
  });
}

let status = 1;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const mongod = await MongoMemoryServer.create({
    instance: { args: ['--wiredTigerCacheSizeGB', '0.25'] },
  });
  try {
    const result = runBuild(mongod.getUri());
    status = result.status ?? 1;
  } finally {
    await mongod.stop();
  }
  if (status === 0) {
    break;
  }
  if (attempt < MAX_ATTEMPTS) {
    console.error(
      `build:ci attempt ${attempt} failed (exit ${status}) — retrying with a fresh mongod`,
    );
  }
}
process.exit(status);
