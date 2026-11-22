/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A `ProcessEnv` holding exactly the given variables, for a spec that hands
 * an environment to the code under test. Next.js types `NODE_ENV` as
 * required on `ProcessEnv`, so a bare object literal is not one.
 */
export const envOf = (vars: Record<string, string>): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  ...vars,
});
