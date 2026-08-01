/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * One child-process adapter for every script in this repo.
 *
 * Four hand-rolled spawn helpers used to live here — in `scripts/e2e.mjs`,
 * `scripts/ci-build.mjs`, `scripts/db-tool-runner.ts` and
 * `src/pre-push-hook.spec.ts` — and each carried a different subset of the
 * invariants below, so a fix learned in one never reached the others. This
 * module carries all of them at once:
 *
 * - **Async spawn only.** Never `spawnSync`: a script that owns a
 *   `MongoMemoryServer` must keep draining mongod's piped output, and a
 *   blocking call wedges it on a full pipe buffer. See
 *   `docs/lessons/testing/spawnsync-starves-owned-child-pipes.md`.
 * - **An `error` listener.** Without one, a missing binary reports a bare
 *   non-zero status (or crashes the process on an unhandled `error` event)
 *   and the ENOENT — the one fact that says what to fix — is discarded.
 *   `spawnError` carries it, command name included.
 * - **Process-group kills.** `pnpm` is only ever the entry point; the work
 *   happens in the tsx/next grandchild it spawns. `detached: true` makes the
 *   child a group leader so the kill can target the whole group.
 * - **Timeouts that use that kill**, so a hung step cannot hang the run.
 * - **Line-buffered capture with a redaction hook**, so a secret split
 *   across two `data` events is still redacted before anything is written.
 */

import { spawn, type ChildProcess } from 'node:child_process';

import type { Readable } from 'node:stream';

/** How the child's stdout/stderr are wired. */
export type ChildOutputMode =
  /** Line-buffered into `lines`/`output`, echoed through the write sinks. */
  | 'capture'
  /** Straight to this process's stdout/stderr; nothing is retained. */
  | 'inherit'
  /** Piped and left untouched, for a caller that wants the raw streams. */
  | 'pipe';

export type ChildStdinMode = 'ignore' | 'inherit' | 'pipe';

export interface RunChildOptions {
  readonly args?: readonly string[];
  readonly command: string;
  readonly cwd?: string;
  /** Spawn as a process-group leader so `kill` can signal the whole group. */
  readonly detached?: boolean;
  /** Passed through verbatim; omit to inherit this process's environment. */
  readonly env?: NodeJS.ProcessEnv;
  readonly output?: ChildOutputMode;
  /** Applied to every whole line before it is retained or written. */
  readonly redactLine?: (line: string) => string;
  readonly stdin?: ChildStdinMode;
  /** Group-kills the child (SIGKILL) once this many ms have passed. */
  readonly timeoutMs?: number;
  readonly writeErr?: (line: string) => void;
  readonly writeOut?: (line: string) => void;
}

export interface ChildResult {
  /** `null` when the child died on a signal or never started. */
  readonly code: number | null;
  /** Captured lines in arrival order, already redacted. Empty unless capturing. */
  readonly lines: readonly string[];
  /** `lines` joined with newlines — what an output scrape reads. */
  readonly output: string;
  readonly signal: NodeJS.Signals | null;
  /** Set only when the child never started (ENOENT, EACCES, …). */
  readonly spawnError?: NodeJS.ErrnoException;
}

export interface ChildHandle {
  /** Resolves once the child has closed; never rejects. */
  readonly closed: Promise<ChildResult>;
  readonly kill: (signal: NodeJS.Signals) => void;
  readonly stderr: Readable | null;
  readonly stdout: Readable | null;
}

/** A timeout means the step is wedged, so it gets the signal it cannot trap. */
const TIMEOUT_SIGNAL = 'SIGKILL';

interface LineForwarding {
  readonly collect: (line: string) => void;
  readonly redact: (line: string) => string;
  readonly stream: Readable;
  readonly write: (line: string) => void;
}

/**
 * Buffers a stream into whole lines before redacting, so a secret split
 * across two chunks cannot slip through unredacted. Returns the flush for the
 * final unterminated line.
 */
const forwardLines = ({ collect, redact, stream, write }: LineForwarding): (() => void) => {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    pending += chunk;
    const lastBreak = pending.lastIndexOf('\n');
    if (lastBreak === -1) {
      return;
    }
    const complete = pending.slice(0, lastBreak).split('\n');
    pending = pending.slice(lastBreak + 1);
    complete.forEach((line) => {
      const redacted = redact(line);
      collect(redacted);
      write(redacted);
    });
  });
  return () => {
    if (pending === '') {
      return;
    }
    const redacted = redact(pending);
    pending = '';
    collect(redacted);
    write(redacted);
  };
};

interface Capture {
  /** Emits the final unterminated line of each stream. */
  readonly flush: () => void;
  readonly lines: string[];
}

/**
 * Wires the child's piped output into whole redacted lines — retained for the
 * caller and echoed through the write sinks, which default to this process's
 * own stdout/stderr. A no-op unless capture was asked for.
 */
const beginCapture = (child: ChildProcess, options: RunChildOptions): Capture => {
  const {
    output,
    redactLine: redact = (line: string): string => line,
    writeErr = (line: string): void => {
      process.stderr.write(`${line}\n`);
    },
    writeOut = (line: string): void => {
      process.stdout.write(`${line}\n`);
    },
  } = options;
  const lines: string[] = [];
  const collect = (line: string): void => {
    lines.push(line);
  };
  const flushes: Array<() => void> = [];
  if (output === 'capture') {
    if (child.stdout) {
      flushes.push(forwardLines({ collect, redact, stream: child.stdout, write: writeOut }));
    }
    if (child.stderr) {
      flushes.push(forwardLines({ collect, redact, stream: child.stderr, write: writeErr }));
    }
  }
  return {
    flush: (): void => {
      flushes.forEach((flushStream) => {
        flushStream();
      });
    },
    lines,
  };
};

/**
 * Signals the child — its whole process group when it was spawned detached,
 * since killing only the direct child would orphan its grandchildren. Never
 * throws: by the time a teardown path runs, the group is often already gone.
 */
const killChild = (child: ChildProcess, detached: boolean, signal: NodeJS.Signals): void => {
  const { pid } = child;
  if (pid === undefined) {
    return;
  }
  try {
    if (detached) {
      // A negative pid addresses the process group led by `pid`.
      process.kill(-pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    // The process (or its group) is already gone.
  }
};

/**
 * Spawns the child and hands back a handle: the caller decides when to await
 * it, read its streams, or kill it. `runChild` is the common case (await the
 * close); a long-lived server that must outlive the call needs this.
 */
export const startChild = (options: RunChildOptions): ChildHandle => {
  const {
    args = [],
    command,
    cwd,
    detached = false,
    env,
    output = 'inherit',
    stdin = 'inherit',
    timeoutMs,
  } = options;

  const childOutput = output === 'inherit' ? 'inherit' : 'pipe';
  const child = spawn(command, [...args], {
    cwd,
    detached,
    env,
    stdio: [stdin, childOutput, childOutput],
  });
  const { flush, lines } = beginCapture(child, options);

  const closed = new Promise<ChildResult>((resolve) => {
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            killChild(child, detached, TIMEOUT_SIGNAL);
          }, timeoutMs);
    const settle = (ended: Omit<ChildResult, 'lines' | 'output'>): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      flush();
      resolve({ ...ended, lines, output: lines.join('\n') });
    };
    // Resolving here rather than waiting for `close` keeps a failed spawn from
    // depending on stream teardown that may never come.
    child.on('error', (spawnError: NodeJS.ErrnoException) => {
      settle({ code: null, signal: null, spawnError });
    });
    child.on('close', (code, signal) => {
      settle({ code, signal });
    });
  });

  return {
    closed,
    kill: (signal: NodeJS.Signals): void => {
      killChild(child, detached, signal);
    },
    stderr: child.stderr,
    stdout: child.stdout,
  };
};

/** Runs a child to completion. Never rejects — inspect the result instead. */
export const runChild = (options: RunChildOptions): Promise<ChildResult> =>
  startChild(options).closed;
