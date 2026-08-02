/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { execFileSync, spawn } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Repo-policy check for `.husky/pre-push`, not a unit test. The branch guard
 * decides what may reach `main`, and it silently regressed once already: an
 * earlier version tested the checked-out branch instead of the refs being
 * pushed, which rejected `git push origin --delete <merged-branch>` run from
 * main — ordinary post-merge cleanup — while letting the same command through
 * from anywhere else.
 *
 * The hook is driven exactly as git drives it: one
 * `<local ref> <local sha> <remote ref> <remote sha>` line per ref on stdin.
 * The guard cases below resolve inside the guard itself, against the real
 * repository. The gate cases run against a sandbox instead — see
 * `createSandbox` — because reaching the gate in the real repository would
 * fetch from the network and then run the whole suite from inside the suite.
 */
const ZERO = '0'.repeat(40);
const HEAD_SHA = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const LOG = `${process.env.TMPDIR ?? '/tmp'}/husky-pre-push.log`;
const HOOK = join(process.cwd(), '.husky', 'pre-push');

interface HookRun {
  code: number;
  log: string;
}

/**
 * Both shells, because the two disagree in ways that silently break hooks.
 * macOS `/bin/sh` is bash in POSIX mode and forgives a redirection failure on
 * a special builtin; dash — `/bin/sh` on Debian and on the CI runners — treats
 * it as fatal and kills the script with status 2 and no output. A `/dev/tty`
 * probe written as a brace group did exactly that, so the hook died before it
 * logged anything anywhere without a controlling terminal. Testing only the
 * shebang's shell would leave that whole class invisible on a Mac.
 */
const SHELLS = ['/bin/sh', '/bin/dash'].filter((shell) => existsSync(shell));

const runHook = (shell: string, refLine: string): Promise<HookRun> =>
  new Promise((settle) => {
    const child = spawn(shell, ['.husky/pre-push'], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end(`${refLine}\n`);
    child.on('close', (code) => {
      settle({ code: code ?? 1, log: readFileSync(LOG, 'utf8') });
    });
  });

interface Sandbox {
  binDir: string;
  headSha: string;
  logDir: string;
  pnpmArgsLog: string;
  workDir: string;
}

interface SandboxRun extends HookRun {
  /** One line per `pnpm` invocation the hook made, as the stub recorded it. */
  pnpmCalls: string[];
}

/**
 * A throwaway repository whose `origin` is a bare repo on disk, plus a stub
 * `pnpm` first on `PATH`. Together they let the hook run all the way to its
 * final stage without touching the network and without re-entering the test
 * suite: the fetch and the up-to-date check resolve against the local bare
 * repo, and the stub records what the hook asked `pnpm` to do instead of
 * doing it. `GATE_EXIT` makes the stub fail on demand, which is the only way
 * to exercise the hook's failure branch under both shells.
 *
 * `branch.autoSetupMerge=false` keeps the feature branch upstream-less
 * whatever the developer's global git config says, so the hook always takes
 * its `origin/main` fallback path and the fixture stays deterministic.
 */
const createSandbox = (): Sandbox => {
  const root = mkdtempSync(join(tmpdir(), 'pre-push-gate-'));
  const remoteDir = join(root, 'remote.git');
  const workDir = join(root, 'work');
  const binDir = join(root, 'bin');

  const git = (...args: string[]): void => {
    execFileSync(
      'git',
      [
        '-c',
        'branch.autoSetupMerge=false',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'user.email=gate@example.test',
        '-c',
        'user.name=Gate Fixture',
        ...args,
      ],
      { cwd: workDir, stdio: 'ignore' }
    );
  };

  execFileSync('git', ['init', '--bare', '--initial-branch=main', remoteDir], { stdio: 'ignore' });
  mkdirSync(workDir);
  git('init', '--initial-branch=main');
  git('remote', 'add', 'origin', remoteDir);
  writeFileSync(join(workDir, 'base.ts'), 'export const base = 1;\n');
  git('add', '.');
  git('commit', '-m', 'chore: base');
  git('push', '-u', 'origin', 'main');
  git('checkout', '-b', 'chore/gate');
  writeFileSync(join(workDir, 'ahead.ts'), 'export const ahead = 2;\n');
  git('add', '.');
  git('commit', '-m', 'chore: ahead');

  mkdirSync(binDir);
  const stub = join(binDir, 'pnpm');
  writeFileSync(
    stub,
    '#!/bin/sh\nprintf \'%s\\n\' "$*" >> "$PNPM_ARGS_LOG"\nexit "${GATE_EXIT:-0}"\n'
  );
  chmodSync(stub, 0o755);

  return {
    binDir,
    headSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workDir, encoding: 'utf8' }).trim(),
    logDir: root,
    pnpmArgsLog: join(root, 'pnpm-args.log'),
    workDir,
  };
};

const sandbox = createSandbox();

afterAll(() => {
  rmSync(sandbox.logDir, { force: true, recursive: true });
});

const runHookInSandbox = (shell: string, gateExit: number): Promise<SandboxRun> =>
  new Promise((settle) => {
    writeFileSync(sandbox.pnpmArgsLog, '');
    const child = spawn(shell, [HOOK], {
      cwd: sandbox.workDir,
      env: {
        ...process.env,
        GATE_EXIT: String(gateExit),
        PATH: `${sandbox.binDir}:${process.env.PATH ?? ''}`,
        PNPM_ARGS_LOG: sandbox.pnpmArgsLog,
        TMPDIR: sandbox.logDir,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end(`refs/heads/chore/gate ${sandbox.headSha} refs/heads/chore/gate ${ZERO}\n`);
    child.on('close', (code) => {
      settle({
        code: code ?? 1,
        log: readFileSync(join(sandbox.logDir, 'husky-pre-push.log'), 'utf8'),
        pnpmCalls: readFileSync(sandbox.pnpmArgsLog, 'utf8')
          .split('\n')
          .filter((line) => line !== ''),
      });
    });
  });

describe.each(SHELLS)('pre-push branch guard under %s', (shell) => {
  it('allows deleting a merged feature branch', async () => {
    const { code, log } = await runHook(
      shell,
      `(delete) ${ZERO} refs/heads/feature/already-merged ${HEAD_SHA}`
    );
    expect(code).toBe(0);
    expect(log).toContain('Only ref deletions');
  });

  it.each(['main', 'master'])('refuses commits pushed to %s', async (branch) => {
    const { code, log } = await runHook(
      shell,
      `refs/heads/${branch} ${HEAD_SHA} refs/heads/${branch} ${ZERO}`
    );
    expect(code).toBe(1);
    expect(log).toContain(`Refusing to push to '${branch}'`);
  });

  it('refuses to delete main, rather than waving it through as a deletion', async () => {
    const { code, log } = await runHook(shell, `(delete) ${ZERO} refs/heads/main ${HEAD_SHA}`);
    expect(code).toBe(1);
    expect(log).toContain("Refusing to push to 'main'");
  });
});

describe.each(SHELLS)('pre-push gate under %s', (shell) => {
  it('runs the one gate script rather than the checks one by one', async () => {
    const { pnpmCalls } = await runHookInSandbox(shell, 0);
    expect(pnpmCalls).toEqual(['gate']);
  });

  it('pushes when the gate passes', async () => {
    const { code } = await runHookInSandbox(shell, 0);
    expect(code).toBe(0);
  });

  it('refuses the push when the gate fails', async () => {
    const { code } = await runHookInSandbox(shell, 1);
    expect(code).toBe(1);
  });

  it('says the gate is what failed', async () => {
    const { log } = await runHookInSandbox(shell, 1);
    expect(log).toContain('The gate failed');
  });
});
