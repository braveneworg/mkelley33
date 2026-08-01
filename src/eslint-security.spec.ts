/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { ESLint } from 'eslint';

/**
 * Repo-policy check, not a unit test. `eslint.config.mjs` enables thirteen
 * `eslint-plugin-security` rules everywhere and exempts none of them, and the
 * cheapest way to undo that is a scoped `files: [...]` block setting one to
 * `'off'` — invisible in review, silent at runtime. This resolves the config
 * ESLint would actually apply, so an exemption added anywhere fails here.
 *
 * `detect-non-literal-fs-filename` is deliberately absent from the config;
 * the reasoning is recorded there. It is asserted absent rather than enabled
 * so that turning it back on is also a deliberate, visible change.
 */
const ENABLED = [
  'security/detect-bidi-characters',
  'security/detect-buffer-noassert',
  'security/detect-child-process',
  'security/detect-disable-mustache-escape',
  'security/detect-eval-with-expression',
  'security/detect-new-buffer',
  'security/detect-no-csrf-before-method-override',
  'security/detect-non-literal-regexp',
  'security/detect-non-literal-require',
  'security/detect-object-injection',
  'security/detect-possible-timing-attacks',
  'security/detect-pseudoRandomBytes',
  'security/detect-unsafe-regex',
] as const;

const NOT_RUN = 'security/detect-non-literal-fs-filename';

/** ESLint reports severity as 0 | 1 | 2, or as the first element of an array. */
const severityOf = (setting: unknown): number => {
  const value = Array.isArray(setting) ? setting[0] : setting;
  if (typeof value === 'number') {
    return value;
  }
  return value === 'error' ? 2 : value === 'warn' ? 1 : 0;
};

/**
 * A source file and a spec file: past exemptions were scoped to tests, so
 * checking only production code would have missed them.
 */
const SAMPLES = ['src/lib/first-user-seed.ts', 'src/collections/access.spec.ts'];

describe.each(SAMPLES)('security rules resolved for %s', (file) => {
  /**
   * A Map, not the raw record: reading it by a computed key is precisely the
   * pattern `detect-object-injection` flags, and that rule now applies to spec
   * files too — this very file was its first catch.
   */
  let rules: Map<string, unknown> = new Map();

  /**
   * Resolved once per file, not per test: `calculateConfigForFile` loads the
   * whole plugin graph behind `eslint.config.mjs`, and doing that per test
   * (28 resolutions) intermittently blew vitest's 5s default under a cold
   * module cache with the full suite's workers contending. The explicit
   * timeout budgets the one genuinely slow step instead of every assertion.
   */
  beforeAll(async () => {
    const config: unknown = await new ESLint().calculateConfigForFile(file);
    const record = (config as { rules?: Record<string, unknown> }).rules ?? {};
    rules = new Map(Object.entries(record));
  }, 30_000);

  it.each(ENABLED)('enables %s', (rule) => {
    expect(severityOf(rules.get(rule))).toBeGreaterThan(0);
  });

  it(`leaves ${NOT_RUN} out of the ruleset entirely`, () => {
    expect(rules.has(NOT_RUN)).toBe(false);
  });
});
