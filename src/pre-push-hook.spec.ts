/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

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
 * A push of real commits to a feature branch is deliberately not exercised
 * here, because the hook would go on to fetch, typecheck, lint and run the
 * whole suite — the four cases below all resolve inside the guard itself.
 */
const ZERO = '0'.repeat(40);
const HEAD_SHA = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const LOG = `${process.env.TMPDIR ?? '/tmp'}/husky-pre-push.log`;

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
  new Promise((resolve) => {
    const child = spawn(shell, ['.husky/pre-push'], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end(`${refLine}\n`);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, log: readFileSync(LOG, 'utf8') });
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
