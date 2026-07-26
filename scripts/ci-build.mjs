import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawnSync } from 'node:child_process';

const mongod = await MongoMemoryServer.create();
let status = 1;
try {
  const result = spawnSync('pnpm', ['build'], {
    env: {
      ...process.env,
      DATABASE_URL: mongod.getUri(),
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? 'ci-build-secret',
    },
    stdio: 'inherit',
  });
  status = result.status ?? 1;
} finally {
  await mongod.stop();
}
process.exit(status);
