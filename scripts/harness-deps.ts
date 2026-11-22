/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The real-world half of `@/lib/harness/docker-harness`, shared by
 * `ci-build.ts` and `e2e.ts`: the process environment, the file reads and the
 * child runner that module is handed so its spec can do without them.
 */

import { readdirSync, readFileSync } from 'node:fs';

import type { HarnessDeps } from '@/lib/harness/docker-harness';
import { runChild } from '@/lib/proc/run-child';

const TERMINATION_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

/** `prefix` opens every line this logs, in the calling script's own style. */
export const harnessDeps = (prefix: string): HarnessDeps => ({
  env: process.env,
  // Names at the root only. Nothing here opens a file in the working directory.
  listWorkdir: () => readdirSync('.'),
  log: (message) => {
    console.error(`${prefix} ${message}`);
  },
  // A listener keeps Node from exiting on the signal, so the harness is
  // still here to take the containers down — which is also what ends the
  // docker command it is waiting on. Ctrl-C reaches the docker CLI by itself
  // (it is not spawned detached); `kill` and a closed terminal do not.
  // Nothing can be done about SIGKILL.
  onTerminate: (stop) => {
    for (const signal of TERMINATION_SIGNALS) {
      process.on(signal, () => {
        console.error(`${prefix} received ${signal} — stopping the containers`);
        stop();
      });
    }
  },
  pid: process.pid,
  readMiseToml: () => readFileSync('mise.toml', 'utf8'),
  run: runChild,
});
