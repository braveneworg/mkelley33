/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Puts `pnpm build:ci` and `pnpm e2e` where
 * docs/adr/0003-builds-and-e2e-run-in-docker.md says they belong, and gives
 * each a throwaway Mongo:
 *
 * - on a developer's machine the script is re-run inside the toolchain
 *   container, so it never shares a filesystem with `.env.local`;
 * - inside that container, and on the CI runner, the script's own `work`
 *   runs against a Mongo container.
 *
 * Everything that touches the outside world arrives through `HarnessDeps`,
 * so the spec can hold the order of operations — above all that the
 * containers are torn down on every path — without starting Docker.
 */

import {
  mongoPortArgs,
  nodeVersionFromMise,
  projectName,
  runInToolchainArgs,
  startMongoArgs,
  tearDownArgs,
  type HarnessKind,
} from '@/lib/harness/compose';
import { publishedMongoUrl } from '@/lib/harness/mongo-url';
import { envFilesIn, resolveRunMode, type RunMode } from '@/lib/harness/run-mode';
import type { ChildResult, RunChildOptions } from '@/lib/proc/run-child';

/** What a job's `work` is told about the run it is part of. */
export interface HarnessContext {
  /** Where the work is happening — never `launch-container`, which does none. */
  readonly mode: Exclude<RunMode, 'launch-container'>;
  /** The throwaway Mongo server, with no database named yet. */
  readonly mongoUrl: string;
}

export interface HarnessJob {
  readonly kind: HarnessKind;
  /** The calling script, as the path to re-run inside the container. */
  readonly script: string;
  /** Does the job against the given Mongo server; resolves to an exit status. */
  readonly work: (context: HarnessContext) => Promise<number>;
}

export interface HarnessDeps {
  readonly env: NodeJS.ProcessEnv;
  /**
   * The names at the root of the working directory — names only, never
   * contents. The root is where `next build` looks for env files.
   */
  readonly listWorkdir: () => readonly string[];
  readonly log: (message: string) => void;
  /**
   * Registers `stop` to be called when this process is told to end — Ctrl-C,
   * `kill`, a closed terminal — and keeps the process alive past the signal,
   * so that it is still here to take its containers down.
   */
  readonly onTerminate: (stop: () => void) => void;
  readonly pid: number;
  readonly readMiseToml: () => string;
  readonly run: (options: RunChildOptions) => Promise<ChildResult>;
}

const DOCKER = 'docker';

const DOCKER_REQUIRED =
  'Docker is required to run this command and it could not be started. ' +
  'Install Docker and make sure its daemon is running. ' +
  'See docs/adr/0003-builds-and-e2e-run-in-docker.md.';

/** One run's compose project, and what is needed to send it a command. */
interface Project {
  readonly env: NodeJS.ProcessEnv;
  readonly log: HarnessDeps['log'];
  readonly name: string;
  readonly run: HarnessDeps['run'];
}

/**
 * Runs one compose command for the project, explaining a missing docker
 * binary. `buildArgs` is one of the builders in `compose.ts`, given the
 * project's name here so no caller has to repeat it.
 */
const docker = async (
  { env, log, name, run }: Project,
  buildArgs: (project: string) => readonly string[],
  output: RunChildOptions['output'] = 'inherit'
): Promise<ChildResult> => {
  const result = await run({
    args: buildArgs(name),
    command: DOCKER,
    env,
    output,
    stdin: 'ignore',
  });
  if (result.spawnError) {
    log(DOCKER_REQUIRED);
  }
  return result;
};

/** Never changes the run's status: by now the work has already passed or failed. */
const tearDown = async (project: Project): Promise<void> => {
  const { code } = await docker(project, tearDownArgs);
  if (code !== 0) {
    const { log, name } = project;
    log(
      `could not tear down the compose project ${name} — remove it with ` +
        `\`docker compose --project-name ${name} down --volumes\`.`
    );
  }
};

/**
 * Runs `task`, then takes the project down whatever happened.
 *
 * A termination signal takes it down at once as well, without waiting for
 * `task`: removing the containers is what ends a `docker compose run` that
 * is waiting on one, and only Ctrl-C reaches the docker CLI by itself. That
 * early teardown races the command it is stopping, so its own failure is not
 * reported; the final one, made after everything has settled, is.
 */
const withTearDown = async (
  project: Project,
  onTerminate: HarnessDeps['onTerminate'],
  task: () => Promise<number>
): Promise<number> => {
  let early: Promise<unknown> | undefined;
  onTerminate(() => {
    early ??= docker(project, tearDownArgs);
  });
  try {
    return await task();
  } finally {
    await early;
    await tearDown(project);
  }
};

const launchContainer = async ({ script }: HarnessJob, project: Project): Promise<number> => {
  const { code } = await docker(project, (name) =>
    runInToolchainArgs(name, ['pnpm', 'exec', 'tsx', script])
  );
  return code ?? 1;
};

const workOnRunner = async ({ work }: HarnessJob, project: Project): Promise<number> => {
  const started = await docker(project, startMongoArgs);
  if (started.code !== 0) {
    project.log('the Mongo container did not start.');
    return 1;
  }
  const port = await docker(project, mongoPortArgs, 'capture');
  const mongoUrl = port.code === 0 ? publishedMongoUrl(port.output) : null;
  if (mongoUrl === null) {
    project.log('could not find the loopback address Mongo was published on.');
    return 1;
  }
  return work({ mode: 'on-runner', mongoUrl });
};

const workInContainer = ({ work }: HarnessJob, { env, log }: HarnessDeps): Promise<number> => {
  const mongoUrl = env.HARNESS_MONGO_URL;
  if (mongoUrl === undefined || mongoUrl === '') {
    log('HARNESS_MONGO_URL is not set — docker/compose.yaml sets it for the container.');
    return Promise.resolve(1);
  }
  return work({ mode: 'in-container', mongoUrl });
};

/**
 * True when the working directory is safe to build in. Both places the work
 * happens are meant to have no env file: the image is built through
 * `.dockerignore`, and a runner's checkout never had one. One at the root
 * anyway means `next build` would load it — and on the runner path it means
 * this is really a developer's machine with `GITHUB_ACTIONS=true` set.
 */
const hasNoEnvFile = ({ listWorkdir, log }: HarnessDeps): boolean => {
  const envFiles = envFilesIn(listWorkdir());
  if (envFiles.length > 0) {
    log(
      `refusing to run: the root of the working directory holds ${envFiles.join(', ')}. ` +
        'A build must never be able to load an env file — see ' +
        'docs/adr/0003-builds-and-e2e-run-in-docker.md.'
    );
    return false;
  }
  return true;
};

/** Runs the job in the place its environment calls for; resolves to an exit status. */
export const runInHarness = (job: HarnessJob, deps: HarnessDeps): Promise<number> => {
  const mode = resolveRunMode(deps.env);
  if (mode !== 'launch-container' && !hasNoEnvFile(deps)) {
    return Promise.resolve(1);
  }
  if (mode === 'in-container') {
    return workInContainer(job, deps);
  }

  const { env, log, onTerminate, pid, readMiseToml, run } = deps;
  const project: Project = {
    // Compose reads the image's Node version from this variable.
    env: { ...env, HARNESS_NODE_VERSION: nodeVersionFromMise(readMiseToml()) },
    log,
    name: projectName(job.kind, pid),
    run,
  };
  return withTearDown(project, onTerminate, () =>
    mode === 'on-runner' ? workOnRunner(job, project) : launchContainer(job, project)
  );
};
