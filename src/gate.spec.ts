/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import { z } from 'zod';

import { stepsForJob } from '@/lib/deploy/ci-workflow';

/**
 * Repo-policy check, not a unit test. "The gate" used to be written down in
 * three places and the three copies disagreed:
 *
 * - the `ci` job ran lint, typecheck and coverage. Lint ran with `--fix`, so
 *   its repairs were written to a runner that is then thrown away, and it
 *   never ran `format:check` — ESLint's ignore list covers Markdown, JSON and
 *   CSS, so formatting regressions in those reached `main` unchallenged.
 * - `.husky/pre-push` ran typecheck, lint, `format:check` and coverage.
 * - `AGENTS.md` told contributors to finish with `pnpm run format`, which
 *   WRITES; a formatter that rewrites the tree cannot fail it.
 *
 * There is one definition now — the `gate` script — and this spec is what
 * stops the copies growing back: every caller delegates to it, and the script
 * itself stays the four checks.
 *
 * Every assertion is written so that DELETING the thing it protects fails it.
 * `toEqual` over a filtered list turns a vanished step into an empty array
 * rather than a smaller index; the guard that `src/lib/deploy/ci-workflow.ts`
 * was written to replace compared raw `indexOf` results, where a deleted step
 * scored -1 and sailed through. See that module's header comment.
 */

const packageSchema = z.object({ scripts: z.record(z.string(), z.string()) });

/** A Map, not the raw record — computed member access trips `detect-object-injection`. */
const scripts = new Map(
  Object.entries(packageSchema.parse(JSON.parse(readFileSync('package.json', 'utf8'))).scripts)
);

const script = (name: string): string => {
  const command = scripts.get(name);
  if (command === undefined) {
    throw new Error(`package.json declares no "${name}" script`);
  }
  return command;
};

/** The four checks the gate is, in the order it runs them: cheapest first. */
const GATE_STEPS = ['format:check', 'typecheck', 'lint:check', 'test:coverage:check'] as const;

/** The script names `gate` chains together, stripped of their `pnpm run` prefix. */
const gateDelegates = (): string[] =>
  script('gate')
    .split('&&')
    .map((command) => command.trim().replace(/^pnpm (?:run )?/, ''));

const ciRunSteps = stepsForJob(readFileSync('.github/workflows/ci.yml', 'utf8'), 'ci').flatMap(
  ({ run }) => (run === undefined ? [] : [run.trim()])
);

const hookLines = readFileSync('.husky/pre-push', 'utf8')
  .split('\n')
  .map((line) => line.trim());

const agentsGuide = readFileSync('AGENTS.md', 'utf8');

describe('the gate script', () => {
  it('is exactly the four checks, cheapest first', () => {
    expect(gateDelegates()).toEqual([...GATE_STEPS]);
  });

  it('delegates only to scripts that exist', () => {
    expect(GATE_STEPS.filter((name) => !scripts.has(name))).toEqual([]);
  });

  it('type-checks without emitting', () => {
    expect(script('typecheck')).toContain('tsc --noEmit');
  });

  it('lints with ESLint', () => {
    expect(script('lint:check')).toContain('eslint');
  });

  it('checks formatting instead of writing it', () => {
    expect(script('format:check')).toMatch(/prettier .*--check/);
  });

  it('runs the suite under the coverage thresholds', () => {
    expect(script('test:coverage:check')).toContain('--coverage');
  });

  it('never rewrites the tree it is checking', () => {
    expect(GATE_STEPS.map(script).filter((command) => /--fix|--write/.test(command))).toEqual([]);
  });
});

describe('the ci job', () => {
  it('runs the gate', () => {
    expect(ciRunSteps.filter((run) => /^pnpm (?:run )?gate$/.test(run))).toEqual(['pnpm gate']);
  });

  it('never re-runs an individual check beside the gate', () => {
    expect(
      ciRunSteps.filter((run) => /pnpm (?:run )?(?:lint|typecheck|test|format)/.test(run))
    ).toEqual([]);
  });

  it('runs nothing but the gate and the build', () => {
    expect(ciRunSteps).toEqual(['pnpm gate', 'pnpm build:ci']);
  });
});

describe('the pre-push hook', () => {
  it('runs the same gate', () => {
    expect(hookLines.filter((line) => /^pnpm (?:run )?gate$/.test(line))).toEqual(['pnpm gate']);
  });

  it('never re-runs an individual check inline', () => {
    const inlineChecks = hookLines.filter((line) =>
      /^pnpm (?:exec tsc|run (?:lint|format|test))/.test(line)
    );
    expect(inlineChecks).toEqual([]);
  });
});

describe('the contributor guide', () => {
  it('names the gate', () => {
    expect(agentsGuide).toContain('pnpm run gate');
  });

  it('never presents the formatter as a check', () => {
    expect(agentsGuide).not.toMatch(/pnpm run format(?![:\w-])/);
  });
});
