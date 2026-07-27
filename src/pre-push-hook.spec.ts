/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

const runHook = (refLine: string): Promise<HookRun> =>
  new Promise((resolve) => {
    const child = spawn('.husky/pre-push', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end(`${refLine}\n`);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, log: readFileSync(LOG, 'utf8') });
    });
  });

describe('pre-push branch guard', () => {
  it('allows deleting a merged feature branch', async () => {
    const { code, log } = await runHook(
      `(delete) ${ZERO} refs/heads/feature/already-merged ${HEAD_SHA}`
    );
    expect(code).toBe(0);
    expect(log).toContain('Only ref deletions');
  });

  it.each(['main', 'master'])('refuses commits pushed to %s', async (branch) => {
    const { code, log } = await runHook(
      `refs/heads/${branch} ${HEAD_SHA} refs/heads/${branch} ${ZERO}`
    );
    expect(code).toBe(1);
    expect(log).toContain(`Refusing to push to '${branch}'`);
  });

  it('refuses to delete main, rather than waving it through as a deletion', async () => {
    const { code, log } = await runHook(`(delete) ${ZERO} refs/heads/main ${HEAD_SHA}`);
    expect(code).toBe(1);
    expect(log).toContain("Refusing to push to 'main'");
  });
});
