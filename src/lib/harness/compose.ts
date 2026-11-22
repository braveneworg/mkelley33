/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * What `docker compose` is told on behalf of `pnpm build:ci` and `pnpm e2e`:
 * the commands, as argument lists, and the Node version the toolchain image
 * is built on. No process is started here — `docker-harness.ts` runs the
 * commands, and `docker/compose.yaml` is the file they address.
 */

/** Which command owns a run. Part of the project name, so the two never share containers. */
export type HarnessKind = 'build' | 'e2e';

const COMPOSE_FILE = 'docker/compose.yaml';

/**
 * Compose fills `${…}` references from a `.env` file it finds beside the
 * compose file or in the working directory. Handing it an empty file instead
 * means it never opens one of ours.
 */
const NO_ENV_FILE = '/dev/null';

/**
 * Names `docker/compose.yaml` must agree with. `src/docker-policy.spec.ts`
 * fails if the file and these drift apart.
 */
export const MONGO_SERVICE = 'mongo';
export const TOOLCHAIN_SERVICE = 'toolchain';
export const MONGO_PORT = '27017';

/**
 * One compose project per run. `pnpm build:ci` and `pnpm e2e` — or the same
 * command in two worktrees — each get their own network and their own Mongo,
 * and tearing one down cannot touch another.
 */
export const projectName = (kind: HarnessKind, pid: number): string => `mkelley33-${kind}-${pid}`;

const compose = (project: string, rest: readonly string[]): string[] => [
  'compose',
  '--project-name',
  project,
  '--file',
  COMPOSE_FILE,
  '--env-file',
  NO_ENV_FILE,
  ...rest,
];

/**
 * Runs `command` in the toolchain container, starting Mongo first (the
 * compose file makes the container wait until it is healthy). `--build`
 * re-copies the working tree, so the run tests the source as it is now;
 * `--no-TTY` keeps the output plain whether or not a terminal is attached.
 */
export const runInToolchainArgs = (project: string, command: readonly string[]): string[] =>
  compose(project, ['run', '--rm', '--build', '--no-TTY', TOOLCHAIN_SERVICE, ...command]);

/** Starts Mongo alone and returns once its healthcheck passes. */
export const startMongoArgs = (project: string): string[] =>
  compose(project, ['up', '--detach', '--wait', MONGO_SERVICE]);

/** Prints the host address Docker published Mongo on, as `127.0.0.1:<port>`. */
export const mongoPortArgs = (project: string): string[] =>
  compose(project, ['port', MONGO_SERVICE, MONGO_PORT]);

/**
 * Removes everything the project created. `--rmi local` takes the image the
 * project built: every run builds under its own project name, so without it
 * each run would leave a tagged image behind. The layers stay in the build
 * cache, which is what keeps the next build fast.
 */
export const tearDownArgs = (project: string): string[] =>
  compose(project, ['down', '--volumes', '--remove-orphans', '--rmi', 'local']);

/** `mise.toml`'s node entry: an exact `node = "x.y.z"`, the version captured. */
export const MISE_NODE_VERSION = /^node = "(\d+\.\d+\.\d+)"$/m;

/**
 * The Node version `mise.toml` pins, which becomes the toolchain image's
 * base tag. `mise.toml` is the one place the version is declared (see
 * `src/node-version.spec.ts`); reading it here keeps the image from becoming
 * a second.
 */
export const nodeVersionFromMise = (miseToml: string): string => {
  const version = MISE_NODE_VERSION.exec(miseToml)?.[1];
  if (version === undefined) {
    throw new Error('mise.toml pins no exact node version (expected `node = "x.y.z"`)');
  }
  return version;
};
