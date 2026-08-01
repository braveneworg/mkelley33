/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared child-process plumbing for `db-backup.ts` / `db-restore.ts`. Spawns
 * asynchronously (never spawnSync — see
 * docs/lessons/testing/spawnsync-starves-owned-child-pipes.md) and forwards
 * the tool's output line by line through `redactSecrets`, so a connection
 * string can never reach the terminal even if a tool prints it.
 */

import { spawn } from 'node:child_process';

import { redactSecrets } from '@/lib/db-backup';

type WriteLine = (line: string) => void;

/**
 * Buffers a stream into whole lines before redacting, so a secret split
 * across two chunks cannot slip through unredacted. Returns the flush for
 * the final unterminated line.
 */
const forwardLines = (
  stream: NodeJS.ReadableStream,
  write: WriteLine,
  secrets: readonly string[]
): (() => void) => {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    pending += chunk;
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    lines.forEach((line) => {
      write(redactSecrets(line, secrets));
    });
  });
  return () => {
    if (pending !== '') {
      write(redactSecrets(pending, secrets));
      pending = '';
    }
  };
};

/**
 * Runs a MongoDB Database Tools binary and resolves with its exit code —
 * 1 when the binary is missing or dies on a signal. Never rejects, so
 * callers decide how to report failure without a try/catch around plumbing.
 */
export const runTool = (
  tool: string,
  args: readonly string[],
  secrets: readonly string[]
): Promise<number> =>
  new Promise((resolve) => {
    const child = spawn(tool, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const flushOut = forwardLines(child.stdout, (line) => console.info(line), secrets);
    const flushErr = forwardLines(child.stderr, (line) => console.error(line), secrets);
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.error(
          `${tool} not found — install the MongoDB Database Tools ` +
            '(brew install mongodb-database-tools) and retry'
        );
      } else {
        console.error(`${tool} failed to start — ${String(error)}`);
      }
      resolve(1);
    });
    child.on('close', (code) => {
      flushOut();
      flushErr();
      resolve(code ?? 1);
    });
  });
