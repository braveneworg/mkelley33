/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import { parse } from 'yaml';
import { z } from 'zod';

import {
  MONGO_PORT,
  MONGO_SERVICE,
  mongoPortArgs,
  runInToolchainArgs,
  startMongoArgs,
  TOOLCHAIN_SERVICE,
} from '@/lib/harness/compose';

/**
 * Repo-policy check, not a unit test. `docs/adr/0003-builds-and-e2e-run-in-docker.md`
 * puts `pnpm build:ci` and `pnpm e2e` inside containers so that the database
 * `.env.local` names is out of their reach by construction instead of by
 * convention. That only holds while three files keep their shape:
 *
 * - `.dockerignore` keeps every secret-bearing file out of the build context,
 *   so the image cannot contain one;
 * - `docker/compose.yaml` hands the containers no env file and no view of
 *   the working tree;
 * - `docker/Dockerfile` copies the context in rather than mounting it.
 *
 * Each of those is one line away from being undone by a well-meant
 * convenience (an `env_file:`, a `.:/app` mount for faster rebuilds), and the
 * build would stay green. These assertions are what turns that into a red
 * gate.
 *
 * The last block covers the same decision's other half, in
 * `.github/workflows/ci.yml` and the shared setup action: the runner gets its
 * database from the same compose file, and only the job that runs the gate
 * still needs a memory-server binary.
 */

const ignoreLines = new Set(
  readFileSync('.dockerignore', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
);

const serviceSchema = z.object({
  build: z.object({ args: z.record(z.string(), z.string()), context: z.string() }).optional(),
  env_file: z.unknown().optional(),
  environment: z.record(z.string(), z.string()).optional(),
  image: z.string().optional(),
  ports: z.array(z.string()).optional(),
  tmpfs: z.array(z.string()).optional(),
  volumes: z.array(z.string()).optional(),
});

const composeSchema = z.object({
  services: z.object({ mongo: serviceSchema, toolchain: serviceSchema }),
});

const { services } = composeSchema.parse(parse(readFileSync('docker/compose.yaml', 'utf8')));
const { mongo, toolchain } = services;

const dockerfile = readFileSync('docker/Dockerfile', 'utf8');

const SETUP_ACTION = './.github/actions/setup';

const workflowSchema = z.object({
  jobs: z.record(
    z.string(),
    z.object({
      services: z.unknown().optional(),
      steps: z.array(
        z.object({
          run: z.string().optional(),
          uses: z.string().optional(),
          with: z.record(z.string(), z.string()).optional(),
        })
      ),
    })
  ),
});

const jobs = new Map(
  Object.entries(workflowSchema.parse(parse(readFileSync('.github/workflows/ci.yml', 'utf8'))).jobs)
);

/** The `with:` inputs a job passes to the shared setup action. */
const setupInputs = (jobId: string): Map<string, string> => {
  const step = jobs.get(jobId)?.steps.find(({ uses }) => uses === SETUP_ACTION);
  if (step === undefined) {
    throw new Error(`job "${jobId}" does not use ${SETUP_ACTION}`);
  }
  return new Map(Object.entries(step.with ?? {}));
};

const runSteps = (jobId: string): string[] =>
  (jobs.get(jobId)?.steps ?? []).flatMap(({ run }) => (run === undefined ? [] : [run.trim()]));

const setupAction = z
  .object({
    runs: z.object({
      steps: z.array(
        z.object({ env: z.record(z.string(), z.string()).optional(), run: z.string().optional() })
      ),
    }),
  })
  .parse(parse(readFileSync('.github/actions/setup/action.yml', 'utf8')));

/**
 * The files hard constraint #2 in `AGENTS.md` names that can live inside a
 * repository, as ignore patterns, plus `.vercel` (the pulled production
 * env). The `**` forms matter: a bare `.env*` only matches at the context
 * root.
 */
const SECRET_PATTERNS = [
  '.env*',
  '**/.env*',
  '**/.envrc',
  '**/*.pem',
  '**/*.key',
  '**/id_*',
  '**/.aws',
  '**/.npmrc',
  '.vercel',
] as const;

describe('.dockerignore', () => {
  it.each(SECRET_PATTERNS)('keeps %s out of the build context', (pattern) => {
    expect(ignoreLines.has(pattern)).toBe(true);
  });

  /**
   * `.claude/worktrees/` holds whole other checkouts, each with its own
   * ignored files; `.git` holds every blob the repository ever had.
   */
  it.each(['.git', '.claude'])('keeps %s out of the build context', (pattern) => {
    expect(ignoreLines.has(pattern)).toBe(true);
  });

  /** The host's are macOS binaries and a macOS build; the image makes its own. */
  it.each(['**/node_modules', '.next'])('keeps the host %s out of the image', (pattern) => {
    expect(ignoreLines.has(pattern)).toBe(true);
  });

  /** A `!` line re-includes a path, which is how an exclusion is quietly undone. */
  it('re-includes nothing', () => {
    expect([...ignoreLines].filter((line) => line.startsWith('!'))).toEqual([]);
  });
});

/**
 * `src/lib/harness/compose.ts` addresses the compose file by service name
 * and port. Nothing else ties the TypeScript to the YAML, and a rename on
 * one side alone would only show up as a failed run.
 */
describe('the commands the launcher issues', () => {
  const serviceNames = Object.keys(services);

  it('run a service the compose file defines', () => {
    expect(serviceNames).toContain(runInToolchainArgs('p', []).at(-1));
  });

  it('start a service the compose file defines', () => {
    expect(serviceNames).toContain(startMongoArgs('p').at(-1));
  });

  it('name the two services the compose file defines, and no others', () => {
    expect(serviceNames.sort()).toEqual([MONGO_SERVICE, TOOLCHAIN_SERVICE].sort());
  });

  it('ask for the container port the compose file publishes', () => {
    expect(mongo.ports?.[0]?.endsWith(`:${mongoPortArgs('p').at(-1)}`)).toBe(true);
  });

  it('agree with the compose file on the Mongo port', () => {
    expect(toolchain.environment?.HARNESS_MONGO_URL).toBe(
      `mongodb://${MONGO_SERVICE}:${MONGO_PORT}`
    );
  });
});

describe('the toolchain container', () => {
  it('is given no env file', () => {
    expect(toolchain.env_file).toBeUndefined();
  });

  /**
   * The only path shared with the host is the one the run writes its
   * diagnostics to. Mounting the working tree would put `.env.local` back in
   * front of `next build`, which loads it by itself.
   */
  it('mounts nothing from the host except the test-results directory', () => {
    expect(toolchain.volumes).toEqual(['../test-results:/app/test-results']);
  });

  it('is built from the repository root, through .dockerignore', () => {
    expect(toolchain.build?.context).toBe('..');
  });

  /**
   * Compose passes a container only the variables listed here, so this list
   * is everything the host can inject. Nothing in it is a credential.
   */
  it('receives only the harness variables from the host', () => {
    expect(Object.keys(toolchain.environment ?? {}).sort()).toEqual([
      'HARNESS_IN_CONTAINER',
      'HARNESS_MONGO_URL',
    ]);
  });

  /**
   * `mise.toml` stays the one place the Node version is declared (see
   * `src/node-version.spec.ts`); the launcher reads it and passes it in.
   */
  it('takes its Node version from the launcher rather than declaring one', () => {
    expect(toolchain.build?.args.NODE_VERSION).toMatch(/^\$\{HARNESS_NODE_VERSION:\?/);
  });
});

describe('the Mongo container', () => {
  /** Nothing written to it may outlive the run. */
  it('keeps its data in memory', () => {
    expect(mongo.tmpfs).toEqual(['/data/db']);
  });

  it('mounts no volume', () => {
    expect(mongo.volumes).toBeUndefined();
  });

  /**
   * The runner reaches Mongo through a published port. It is bound to
   * loopback and the host side is left for Docker to choose, so it can
   * neither be reached from the network nor collide with a developer's own
   * mongod on 27017.
   */
  it('publishes its port on loopback only, on a port Docker picks', () => {
    expect(mongo.ports).toEqual(['127.0.0.1::27017']);
  });

  it('is pinned to a version rather than following latest', () => {
    expect(mongo.image).toMatch(/^mongo:\d+\.\d+/);
  });
});

describe('docker/Dockerfile', () => {
  it('declares no Node version of its own', () => {
    expect(dockerfile).not.toMatch(/node:\d/);
  });

  it('is based on the Node version it is handed', () => {
    expect(dockerfile).toMatch(/^FROM node:\$\{NODE_VERSION\}/m);
  });

  /**
   * The memory server's postinstall downloads a mongod binary. Nothing in
   * the container starts one.
   */
  it('skips the mongodb-memory-server binary download', () => {
    expect(dockerfile).toMatch(/MONGOMS_DISABLE_POSTINSTALL=1/);
  });
});

describe('the CI workflow', () => {
  /**
   * One database path per command: the scripts start the Mongo container
   * themselves, through the same compose file as a developer's machine. A
   * `services:` block would be a second way to get a database, used only on
   * the runner.
   */
  it('declares no service containers of its own', () => {
    expect([...jobs.values()].filter(({ services }) => services !== undefined)).toEqual([]);
  });

  it('still runs the build check through its script', () => {
    expect(runSteps('ci')).toContain('pnpm build:ci');
  });

  it('still runs the suite through its script', () => {
    expect(runSteps('e2e')).toContain('pnpm e2e');
  });

  /** The gate runs here, and its integration specs start a memory server. */
  it('keeps the memory-server binary cache for the job that runs the gate', () => {
    expect(setupInputs('ci').get('mongodb-binaries-cache')).toBeUndefined();
  });

  /** Nothing in the E2E job starts a memory server any more. */
  it('drops the memory-server binary cache from the e2e job', () => {
    expect(setupInputs('e2e').get('mongodb-binaries-cache')).toBe('false');
  });

  /**
   * Opting out of the cache must also skip the download: the memory
   * server's postinstall would otherwise fetch the binary on every run of a
   * job that never starts it.
   */
  it('skips the memory-server download in a job that opted out of its cache', () => {
    const install = setupAction.runs.steps.find(({ run }) => run?.startsWith('pnpm install'));

    expect(install?.env?.MONGOMS_DISABLE_POSTINSTALL).toBe(
      "${{ inputs.mongodb-binaries-cache == 'true' && '0' || '1' }}"
    );
  });
});
