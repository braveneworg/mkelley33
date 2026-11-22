/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Where `pnpm build:ci` and `pnpm e2e` do their work, decided from the
 * environment alone. See docs/adr/0003-builds-and-e2e-run-in-docker.md.
 *
 * - `launch-container` — a developer's machine. The command does nothing
 *   itself: it starts the toolchain container and re-runs inside it, so the
 *   build never sees `.env.local`.
 * - `in-container` — that re-run. Mongo is the container beside it.
 * - `on-runner` — GitHub Actions. The runner is already a throwaway machine
 *   with no `.env.local`, so the work happens on it directly, against a
 *   Mongo container.
 */
export type RunMode = 'in-container' | 'launch-container' | 'on-runner';

/**
 * Only the exact values count, and the fallback is the container: a stray
 * `CI=1` or a half-set variable in a developer's shell must not be able to
 * move a build onto the host.
 */
export const resolveRunMode = (env: NodeJS.ProcessEnv): RunMode => {
  if (env.HARNESS_IN_CONTAINER === '1') {
    return 'in-container';
  }
  if (env.GITHUB_ACTIONS === 'true') {
    return 'on-runner';
  }
  return 'launch-container';
};

/** `.env`, `.env.local`, `.envrc`, … — anything dotenv or direnv would load. */
const ENV_FILE = /^\.env/;

/** Holds placeholders only, by rule, so the image may carry it. */
const ENV_EXAMPLE = '.env.example';

/**
 * The env files among a directory's entries. The container refuses to work
 * when its copy of the tree has any: `.dockerignore` should have kept them
 * out, and `next build` would load them without being asked.
 */
export const envFilesIn = (entries: readonly string[]): string[] =>
  entries.filter((entry) => ENV_FILE.test(entry) && entry !== ENV_EXAMPLE);
