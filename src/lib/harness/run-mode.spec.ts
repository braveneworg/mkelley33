/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { envFilesIn, resolveRunMode } from '@/lib/harness/run-mode';
import { envOf } from '@/test/process-env';

describe('resolveRunMode', () => {
  /**
   * The default has to be the safe one: with nothing set, the command is on
   * a developer's machine, where `.env.local` exists.
   */
  it('launches the container when nothing says otherwise', () => {
    expect(resolveRunMode(envOf({}))).toBe('launch-container');
  });

  it('does the work in place when the compose file marks the container', () => {
    expect(resolveRunMode(envOf({ HARNESS_IN_CONTAINER: '1' }))).toBe('in-container');
  });

  it('runs on the runner under GitHub Actions', () => {
    expect(resolveRunMode(envOf({ GITHUB_ACTIONS: 'true' }))).toBe('on-runner');
  });

  /** Only the exact values count — a stray `CI=1` in a shell must not unlock host builds. */
  it('ignores a generic CI flag', () => {
    expect(resolveRunMode(envOf({ CI: 'true' }))).toBe('launch-container');
  });

  it('ignores a GITHUB_ACTIONS value other than true', () => {
    expect(resolveRunMode(envOf({ GITHUB_ACTIONS: '1' }))).toBe('launch-container');
  });

  it('ignores a container marker other than 1', () => {
    expect(resolveRunMode(envOf({ HARNESS_IN_CONTAINER: 'true' }))).toBe('launch-container');
  });

  it('never launches a container from inside the container', () => {
    expect(resolveRunMode(envOf({ GITHUB_ACTIONS: 'true', HARNESS_IN_CONTAINER: '1' }))).toBe(
      'in-container'
    );
  });
});

describe('envFilesIn', () => {
  it('finds nothing in a directory with no env files', () => {
    expect(envFilesIn(['package.json', 'src', '.dockerignore'])).toEqual([]);
  });

  it.each(['.env', '.env.local', '.env.production.local', '.envrc'])('finds %s', (name) => {
    expect(envFilesIn(['package.json', name])).toEqual([name]);
  });

  /** The one env file the repo may carry: placeholders only, by rule. */
  it('allows .env.example', () => {
    expect(envFilesIn(['.env.example'])).toEqual([]);
  });

  it('reports every env file it finds', () => {
    expect(envFilesIn(['.env', 'src', '.env.local'])).toEqual(['.env', '.env.local']);
  });
});
