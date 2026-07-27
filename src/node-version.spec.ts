/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. Two files declare a Node version and
 * nothing links them: `.nvmrc` is the version actually installed — by `nvm`
 * locally and by `node-version-file` in all three jobs of
 * `.github/workflows/ci.yml` — while `engines.node` is the floor pnpm
 * enforces on install and the range Vercel reads to choose a function
 * runtime. Raise the floor past `.nvmrc` and every install fails the engines
 * check; the mismatch is invisible in review because the two values sit in
 * different files and neither mentions the other.
 *
 * Both values are required to be a plain `x.y.z` rather than a general semver
 * range, so this comparison stays honest without pulling in `semver` — which
 * is not a direct dependency and so is not importable under pnpm.
 */

interface Semver {
  major: number;
  minor: number;
  patch: number;
}

/** `engines.node`: a `>=` floor, deliberately not a caret or `x` range. */
const ENGINES_FLOOR = /^>=(\d+)\.(\d+)\.(\d+)$/;

/** `.nvmrc`: one exact version, `v` prefix optional. */
const NVMRC_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

const enginesNode = (): string => {
  const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
  return (packageJson as { engines?: { node?: string } }).engines?.node ?? '';
};

const nvmrc = (): string => readFileSync('.nvmrc', 'utf8').trim();

const parse = (value: string, pattern: RegExp): Semver => {
  const match = pattern.exec(value);
  if (match === null) {
    throw new Error(`not a plain x.y.z version: "${value}"`);
  }
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
};

/** True when `version` is at or above `floor`, compared field by field. */
const satisfies = (version: Semver, floor: Semver): boolean => {
  if (version.major !== floor.major) {
    return version.major > floor.major;
  }
  if (version.minor !== floor.minor) {
    return version.minor > floor.minor;
  }
  return version.patch >= floor.patch;
};

describe('Node version declarations', () => {
  it('states engines.node as a plain >=x.y.z floor', () => {
    expect(enginesNode()).toMatch(ENGINES_FLOOR);
  });

  it('states .nvmrc as a single exact version', () => {
    expect(nvmrc()).toMatch(NVMRC_VERSION);
  });

  it('installs a .nvmrc version that satisfies the engines.node floor', () => {
    const installed = parse(nvmrc(), NVMRC_VERSION);
    const floor = parse(enginesNode(), ENGINES_FLOOR);
    expect(satisfies(installed, floor)).toBe(true);
  });
});
