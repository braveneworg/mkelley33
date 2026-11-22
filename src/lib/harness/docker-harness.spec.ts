/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  mongoPortArgs,
  runInToolchainArgs,
  startMongoArgs,
  tearDownArgs,
} from '@/lib/harness/compose';
import { runInHarness, type HarnessDeps, type HarnessJob } from '@/lib/harness/docker-harness';
import type { ChildResult, RunChildOptions } from '@/lib/proc/run-child';
import { envOf } from '@/test/process-env';

const PID = 4242;
const PROJECT = 'mkelley33-e2e-4242';
const MISE_TOML = '[tools]\nnode = "24.22.1"\n';

const exited = (code: null | number, output = ''): ChildResult => ({
  code,
  lines: output === '' ? [] : output.split('\n'),
  output,
  signal: code === null ? 'SIGKILL' : null,
});

const neverStarted: ChildResult = {
  code: null,
  lines: [],
  output: '',
  signal: null,
  spawnError: Object.assign(new Error('spawn docker ENOENT'), { code: 'ENOENT' }),
};

/** The compose subcommand a docker invocation carries: run, up, port or down. */
type Subcommand = 'down' | 'port' | 'run' | 'up';

const SUBCOMMANDS: readonly Subcommand[] = ['down', 'port', 'run', 'up'];

const subcommandOf = ({ args = [] }: RunChildOptions): Subcommand => {
  const found = SUBCOMMANDS.find((name) => args.includes(name));
  if (found === undefined) {
    throw new Error(`unexpected docker invocation: ${args.join(' ')}`);
  }
  return found;
};

interface Scenario {
  readonly env?: NodeJS.ProcessEnv;
  /** Deliver this many termination signals while the given subcommand is running. */
  readonly interrupt?: { readonly during: Subcommand; readonly times: number };
  /**
   * What each compose subcommand resolves to; anything unlisted exits 0. A
   * list is used up one call at a time, for a subcommand that runs twice.
   */
  readonly results?: Partial<Record<Subcommand, ChildResult | ChildResult[]>>;
  readonly work?: HarnessJob['work'];
  readonly workdir?: readonly string[];
}

interface Outcome {
  /** Everything that happened, in order: compose subcommands and `work`. */
  readonly events: string[];
  readonly onTerminate: ReturnType<typeof vi.fn<HarnessDeps['onTerminate']>>;
  readonly logged: string[];
  /** What `runInHarness` rejected with, when it did. */
  readonly failure: unknown;
  readonly run: ReturnType<typeof vi.fn<HarnessDeps['run']>>;
  /** Undefined only when `runInHarness` rejected. */
  readonly status: number | undefined;
  readonly work: ReturnType<typeof vi.fn<HarnessJob['work']>>;
}

const play = async ({
  env = envOf({}),
  interrupt,
  results = {},
  work,
  workdir = [],
}: Scenario): Promise<Outcome> => {
  const events: string[] = [];
  const logged: string[] = [];
  const outcomes = new Map(Object.entries(results));
  const onTerminate = vi.fn<HarnessDeps['onTerminate']>();
  let interruptsLeft = interrupt?.times ?? 0;
  const run = vi.fn<HarnessDeps['run']>((options) => {
    const subcommand = subcommandOf(options);
    events.push(subcommand);
    if (subcommand === interrupt?.during) {
      // The signal arrives while this command is still running.
      for (; interruptsLeft > 0; interruptsLeft -= 1) {
        onTerminate.mock.calls[0]?.[0]();
      }
    }
    const outcome = outcomes.get(subcommand);
    const result = Array.isArray(outcome) ? outcome.shift() : outcome;
    return Promise.resolve(result ?? exited(0, '127.0.0.1:55017'));
  });
  const workSpy = vi.fn<HarnessJob['work']>((context) => {
    events.push('work');
    return work ? work(context) : Promise.resolve(0);
  });
  const outcome = { events, logged, onTerminate, run, work: workSpy };
  try {
    const status = await runInHarness(
      { kind: 'e2e', script: 'scripts/e2e.ts', work: workSpy },
      {
        env,
        listWorkdir: () => workdir,
        log: (message) => {
          logged.push(message);
        },
        onTerminate,
        pid: PID,
        readMiseToml: () => MISE_TOML,
        run,
      }
    );
    return { ...outcome, failure: undefined, status };
  } catch (failure) {
    return { ...outcome, failure, status: undefined };
  }
};

/** The options the fake `run` received for the first call carrying `subcommand`. */
const callFor = (run: Outcome['run'], subcommand: Subcommand): RunChildOptions => {
  const call = run.mock.calls
    .map(([options]) => options)
    .find((o) => subcommandOf(o) === subcommand);
  if (call === undefined) {
    throw new Error(`docker compose ${subcommand} was never run`);
  }
  return call;
};

describe('on a developer machine', () => {
  it('re-runs the script inside the toolchain container', async () => {
    const { run } = await play({});

    expect(callFor(run, 'run')).toMatchObject({
      args: runInToolchainArgs(PROJECT, ['pnpm', 'exec', 'tsx', 'scripts/e2e.ts']),
      command: 'docker',
    });
  });

  /** The work itself must not happen here: this process can see `.env.local`. */
  it('does none of the work on the host', async () => {
    const { work } = await play({});

    expect(work).not.toHaveBeenCalled();
  });

  it("hands compose the Node version mise.toml pins, for the image's base", async () => {
    const { run } = await play({});

    expect(callFor(run, 'run').env?.HARNESS_NODE_VERSION).toBe('24.22.1');
  });

  it('keeps the rest of the environment, so the docker CLI can find its daemon', async () => {
    const { run } = await play({ env: envOf({ DOCKER_HOST: 'unix:///somewhere.sock' }) });

    expect(callFor(run, 'run').env?.DOCKER_HOST).toBe('unix:///somewhere.sock');
  });

  it('gives the container no stdin', async () => {
    const { run } = await play({});

    expect(callFor(run, 'run').stdin).toBe('ignore');
  });

  it("returns the container's exit status", async () => {
    const { status } = await play({ results: { run: exited(3) } });

    expect(status).toBe(3);
  });

  it('fails when the container was killed rather than exiting', async () => {
    const { status } = await play({ results: { run: exited(null) } });

    expect(status).toBe(1);
  });

  it('tears the project down afterwards', async () => {
    const { events } = await play({});

    expect(events).toEqual(['run', 'down']);
  });

  it('tears the project down after a failed run too', async () => {
    const { events } = await play({ results: { run: exited(1) } });

    expect(events).toEqual(['run', 'down']);
  });

  it('addresses the teardown to the same project', async () => {
    const { run } = await play({});

    expect(callFor(run, 'down').args).toEqual(tearDownArgs(PROJECT));
  });

  /**
   * Ctrl-C, `kill`, a closed terminal, a caller's timeout. Whichever it is,
   * the containers must not outlive this process — and only Ctrl-C reaches
   * the docker CLI by itself.
   */
  it('listens for a termination signal', async () => {
    const { onTerminate } = await play({});

    expect(onTerminate).toHaveBeenCalledTimes(1);
  });

  /**
   * Taking the project down is what ends the run: its container is removed
   * under the docker command that is waiting on it.
   */
  it('takes the project down at once when it is told to terminate', async () => {
    const { events } = await play({ interrupt: { during: 'run', times: 1 } });

    expect(events).toEqual(['run', 'down', 'down']);
  });

  /** pnpm follows a second Ctrl-C with a SIGTERM; one teardown is enough. */
  it('starts only one early teardown however many signals arrive', async () => {
    const { events } = await play({ interrupt: { during: 'run', times: 3 } });

    expect(events).toEqual(['run', 'down', 'down']);
  });

  /**
   * The early teardown races the command it is stopping and can fail for
   * that reason alone. Only the final one, made after everything has
   * settled, is worth reporting.
   */
  it('does not report a failure of the early teardown', async () => {
    const { logged } = await play({
      interrupt: { during: 'run', times: 1 },
      results: { down: [exited(1), exited(0)] },
    });

    expect(logged).toEqual([]);
  });

  it('fails when docker is not installed', async () => {
    const { status } = await play({ results: { run: neverStarted } });

    expect(status).toBe(1);
  });

  it('says Docker is required when docker is not installed', async () => {
    const { logged } = await play({ results: { run: neverStarted } });

    expect(logged.join('\n')).toContain('Docker is required');
  });

  it("keeps the run's status when the teardown fails", async () => {
    const { status } = await play({ results: { down: exited(1) } });

    expect(status).toBe(0);
  });

  it('reports a failed teardown, naming the project left behind', async () => {
    const { logged } = await play({ results: { down: exited(1) } });

    expect(logged.join('\n')).toContain(PROJECT);
  });
});

describe('on the CI runner', () => {
  const env = envOf({ GITHUB_ACTIONS: 'true' });

  it('starts Mongo, finds its port, works, then tears down', async () => {
    const { events } = await play({ env });

    expect(events).toEqual(['up', 'port', 'work', 'down']);
  });

  it('starts only the Mongo container', async () => {
    const { run } = await play({ env });

    expect(callFor(run, 'up').args).toEqual(startMongoArgs(PROJECT));
  });

  it('asks compose where Mongo was published, capturing the answer', async () => {
    const { run } = await play({ env });

    expect(callFor(run, 'port')).toMatchObject({
      args: mongoPortArgs(PROJECT),
      output: 'capture',
    });
  });

  it('works against the published loopback address', async () => {
    const { work } = await play({ env, results: { port: exited(0, '127.0.0.1:49200') } });

    expect(work).toHaveBeenCalledWith({
      mode: 'on-runner',
      mongoUrl: 'mongodb://127.0.0.1:49200',
    });
  });

  it("returns the work's status", async () => {
    const { status } = await play({ env, work: () => Promise.resolve(7) });

    expect(status).toBe(7);
  });

  it('never builds or runs the toolchain container', async () => {
    const { events } = await play({ env });

    expect(events).not.toContain('run');
  });

  it('fails without working when Mongo does not start', async () => {
    const { events } = await play({ env, results: { up: exited(1) } });

    expect(events).toEqual(['up', 'down']);
  });

  it('reports a Mongo that did not start as a failure', async () => {
    const { status } = await play({ env, results: { up: exited(1) } });

    expect(status).toBe(1);
  });

  it('fails without working when the published address is unusable', async () => {
    const { events } = await play({ env, results: { port: exited(0, '0.0.0.0:49200') } });

    expect(events).toEqual(['up', 'port', 'down']);
  });

  it('reports an unusable published address as a failure', async () => {
    const { status } = await play({ env, results: { port: exited(1) } });

    expect(status).toBe(1);
  });

  it('lets a failure the work throws surface', async () => {
    const { failure } = await play({
      env,
      work: () => Promise.reject(new Error('build exploded')),
    });

    expect(failure).toEqual(new Error('build exploded'));
  });

  it('tears down even when the work throws', async () => {
    const { events } = await play({
      env,
      work: () => Promise.reject(new Error('build exploded')),
    });

    expect(events).toEqual(['up', 'port', 'work', 'down']);
  });

  it('says Docker is required when docker is not installed', async () => {
    const { logged } = await play({ env, results: { up: neverStarted } });

    expect(logged.join('\n')).toContain('Docker is required');
  });

  it('takes the project down at once when it is told to terminate', async () => {
    const { events } = await play({ env, interrupt: { during: 'up', times: 1 } });

    expect(events.slice(0, 2)).toEqual(['up', 'down']);
  });

  /**
   * A real runner's checkout has no env file. One here means this is a
   * developer's machine with `GITHUB_ACTIONS=true` in its shell, where
   * working in place would put `next build` next to `.env.local`.
   */
  it('refuses to work in a directory that holds an env file', async () => {
    const { events } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(events).toEqual([]);
  });

  it('fails in a directory that holds an env file', async () => {
    const { status } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(status).toBe(1);
  });

  it('names the env file it found', async () => {
    const { logged } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(logged.join('\n')).toContain('.env.local');
  });
});

describe('inside the toolchain container', () => {
  const env = envOf({ HARNESS_IN_CONTAINER: '1', HARNESS_MONGO_URL: 'mongodb://mongo:27017' });

  it('works against the Mongo container beside it', async () => {
    const { work } = await play({ env });

    expect(work).toHaveBeenCalledWith({
      mode: 'in-container',
      mongoUrl: 'mongodb://mongo:27017',
    });
  });

  it("returns the work's status", async () => {
    const { status } = await play({ env, work: () => Promise.resolve(5) });

    expect(status).toBe(5);
  });

  /** There is no docker in the image, and nothing here owns the containers. */
  it('runs no docker command', async () => {
    const { run } = await play({ env });

    expect(run).not.toHaveBeenCalled();
  });

  /** Stopping the container is the launcher's job, from outside it. */
  it('listens for no termination signal', async () => {
    const { onTerminate } = await play({ env });

    expect(onTerminate).not.toHaveBeenCalled();
  });

  /**
   * `.dockerignore` keeps env files out of the image. If one is here anyway
   * the guarantee this container exists for is already broken, and
   * `next build` would load the file without being asked.
   */
  it('refuses to work when its copy of the tree holds an env file', async () => {
    const { work } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(work).not.toHaveBeenCalled();
  });

  it('fails when its copy of the tree holds an env file', async () => {
    const { status } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(status).toBe(1);
  });

  it('names the env file it found, and nothing of its contents', async () => {
    const { logged } = await play({ env, workdir: ['package.json', '.env.local'] });

    expect(logged.join('\n')).toContain('.env.local');
  });

  it('fails when it was not told where Mongo is', async () => {
    const { status } = await play({ env: envOf({ HARNESS_IN_CONTAINER: '1' }) });

    expect(status).toBe(1);
  });

  it('does not work when it was not told where Mongo is', async () => {
    const { work } = await play({ env: envOf({ HARNESS_IN_CONTAINER: '1' }) });

    expect(work).not.toHaveBeenCalled();
  });
});
