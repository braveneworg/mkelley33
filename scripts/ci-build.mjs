import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawnSync } from 'node:child_process';

// CI runners have ~7GB RAM shared between mongod and Next's build workers.
// mongod's WiredTiger cache defaults to ~50% of RAM, which starves the build
// and has caused mid-build server-selection timeouts — cap it, and retry once
// with a fresh mongod in case the instance still dies under pressure.
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
