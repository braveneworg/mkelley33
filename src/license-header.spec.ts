/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Repo-wide policy check, not a unit test: `AGENTS.md` requires the MPL
 * boilerplate on every source file, and a rule nothing verifies is a rule
 * that rots. Enumerating from `git ls-files` means a newly added file is
 * covered the moment it is tracked, with no list to keep in sync.
 */
const HEADER = readFileSync('HEADER.txt', 'utf8').trimEnd();

/** Extensions whose comment syntax the `/* … *\/` boilerplate is valid in. */
const SOURCE_FILE = /\.(cjs|css|jsx?|mjs|mts|tsx?)$/;

/**
 * Rewritten wholesale by tooling — `pnpm run generate:types` for the Payload
 * types, Payload's admin bundler for the import map, and `next build` for
 * `next-env.d.ts` (which says "do not edit" in its own body). A header added
 * here survives only until the next regeneration, so requiring one would turn
 * a green gate red at random.
 */
const GENERATED = new Set([
  'next-env.d.ts',
  'src/app/(payload)/admin/importMap.js',
  'src/payload-types.ts',
]);

/** A shebang must stay on line 1, so the header follows it rather than precedes it. */
const afterShebang = (source: string): string =>
  source.startsWith('#!') ? source.slice(source.indexOf('\n') + 1) : source;

const trackedSourceFiles = (): string[] =>
  execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((file) => file !== '' && SOURCE_FILE.test(file) && !GENERATED.has(file));

describe('MPL license headers', () => {
  const files = trackedSourceFiles();

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s opens with the MPL header', (file) => {
    const source = afterShebang(readFileSync(file, 'utf8'));
    expect(source.slice(0, HEADER.length)).toBe(HEADER);
  });
});
