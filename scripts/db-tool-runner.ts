/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared child-process plumbing for `db-backup.ts` / `db-restore.ts`, now a
 * thin adapter over `@/lib/proc/run-child`: it supplies the redaction hook
 * and the "install the tools" hint, and the adapter supplies the async spawn
 * (never spawnSync — see
 * docs/lessons/testing/spawnsync-starves-owned-child-pipes.md), the
 * line-buffered capture, and the `error` listener.
 */

import { redactSecrets } from '@/lib/db-backup';
import { runChild } from '@/lib/proc/run-child';

/**
 * Runs a MongoDB Database Tools binary and resolves with its exit code —
 * 1 when the binary is missing or dies on a signal. Never rejects, so
 * callers decide how to report failure without a try/catch around plumbing.
 * Output is forwarded line by line through `redactSecrets`, so a connection
 * string can never reach the terminal even if a tool prints it — and never
 * half a line at a time, so a secret split across two chunks is still caught.
 */
export const runTool = async (
  tool: string,
  args: readonly string[],
  secrets: readonly string[]
): Promise<number> => {
  const { code, spawnError } = await runChild({
    args,
    command: tool,
    output: 'capture',
    redactLine: (line) => redactSecrets(line, secrets),
    stdin: 'ignore',
    writeErr: (line) => {
      console.error(line);
    },
    writeOut: (line) => {
      console.info(line);
    },
  });
  if (spawnError) {
    console.error(
      spawnError.code === 'ENOENT'
        ? `${tool} not found — install the MongoDB Database Tools ` +
            '(brew install mongodb-database-tools) and retry'
        : `${tool} failed to start — ${String(spawnError)}`
    );
    return 1;
  }
  return code ?? 1;
};
