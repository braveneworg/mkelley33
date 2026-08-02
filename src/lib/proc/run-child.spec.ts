/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { runChild, startChild } from '@/lib/proc/run-child';

/**
 * Every invariant here was learned the hard way by one of the four spawn
 * helpers this module replaces, and each was missing from at least one of
 * them: an `error` listener so a missing binary reports ENOENT instead of a
 * wrapped exit status, a process-group kill so grandchildren die with their
 * parent, a timeout that fires that kill, and line-buffered capture so a
 * secret split across two chunks is still redacted. The fixtures are
 * `node -e` one-liners: no network, no fixture files, no ordering between
 * tests.
 */
const NODE = process.execPath;

/** Long enough to outlive the assertions, short enough to reap itself. */
const SLEEPS = 'setTimeout(() => {}, 30000)';

/** Prints its own child's pid, then idles — the group-kill fixture. */
const SPAWNS_A_GRANDCHILD = [
  "const { spawn } = require('node:child_process');",
  `const kid = spawn(process.execPath, ['-e', '${SLEEPS}'], { stdio: 'ignore' });`,
  'console.log(kid.pid);',
  SLEEPS,
].join('\n');

/**
 * Tells `ignore` (/dev/null, a character device) from a real pipe — which
 * libuv implements as a socket — without reading from either.
 */
const IS_STDIN_DEV_NULL = "console.log(require('node:fs').fstatSync(0).isCharacterDevice())";

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Capture with sinks that keep the suite's own output clean. */
const captureOnly = { output: 'capture', writeErr: () => {}, writeOut: () => {} } as const;

describe('runChild exit reporting', () => {
  it('resolves with the exit code the child chose', async () => {
    const { code } = await runChild({
      ...captureOnly,
      args: ['-e', 'process.exit(3)'],
      command: NODE,
    });
    expect(code).toBe(3);
  });

  it('resolves with the signal when the child dies on one', async () => {
    const { signal } = await runChild({
      ...captureOnly,
      args: ['-e', "process.kill(process.pid, 'SIGTERM')"],
      command: NODE,
    });
    expect(signal).toBe('SIGTERM');
  });

  it('reports no signal for an ordinary exit', async () => {
    const { signal } = await runChild({
      ...captureOnly,
      args: ['-e', 'process.exit(0)'],
      command: NODE,
    });
    expect(signal).toBeNull();
  });
});

describe('runChild spawn failures', () => {
  /**
   * The failure mode this module exists for: without an `error` listener a
   * missing binary surfaces as a bare non-zero status, and the ENOENT — the
   * one fact that says what to fix — is discarded.
   */
  it('surfaces ENOENT as a spawn error rather than an exit status', async () => {
    const { spawnError } = await runChild({
      ...captureOnly,
      command: 'mkelley33-no-such-binary',
    });
    expect(spawnError?.code).toBe('ENOENT');
  });

  it('names the command that could not be spawned', async () => {
    const { spawnError } = await runChild({
      ...captureOnly,
      command: 'mkelley33-no-such-binary',
    });
    expect(spawnError?.message).toContain('mkelley33-no-such-binary');
  });

  it('reports no exit code for a process that never started', async () => {
    const { code } = await runChild({ ...captureOnly, command: 'mkelley33-no-such-binary' });
    expect(code).toBeNull();
  });

  it('leaves spawnError unset when the child does start', async () => {
    const { spawnError } = await runChild({
      ...captureOnly,
      args: ['-e', ''],
      command: NODE,
    });
    expect(spawnError).toBeUndefined();
  });
});

describe('runChild capture', () => {
  it('retains stdout lines in arrival order', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', "console.log('first'); console.log('second')"],
      command: NODE,
    });
    expect(lines).toEqual(['first', 'second']);
  });

  it('retains stderr lines too, so a scrape sees the whole build log', async () => {
    const { output } = await runChild({
      ...captureOnly,
      args: ['-e', "console.error('cannot connect to MongoDB')"],
      command: NODE,
    });
    expect(output).toContain('cannot connect to MongoDB');
  });

  it('sends stdout lines to the stdout sink', async () => {
    const seen: string[] = [];
    await runChild({
      args: ['-e', "console.log('out'); console.error('err')"],
      command: NODE,
      output: 'capture',
      writeErr: () => {},
      writeOut: (line) => seen.push(line),
    });
    expect(seen).toEqual(['out']);
  });

  it('sends stderr lines to the stderr sink', async () => {
    const seen: string[] = [];
    await runChild({
      args: ['-e', "console.log('out'); console.error('err')"],
      command: NODE,
      output: 'capture',
      writeErr: (line) => seen.push(line),
      writeOut: () => {},
    });
    expect(seen).toEqual(['err']);
  });

  it('flushes a trailing line the child never terminated', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', "process.stdout.write('no trailing newline')"],
      command: NODE,
    });
    expect(lines).toEqual(['no trailing newline']);
  });

  it('writes captured stdout to this process by default', async () => {
    // Recorded into `written` rather than read off the spy: `mockRestore`
    // clears the call log, and it has to run before the assertion so a
    // failure can still print.
    const written: string[] = [];
    const write = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      await runChild({ args: ['-e', "console.log('echoed')"], command: NODE, output: 'capture' });
    } finally {
      write.mockRestore();
    }
    expect(written).toEqual(['echoed\n']);
  });

  it('writes captured stderr to this process by default', async () => {
    const written: string[] = [];
    const write = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      await runChild({ args: ['-e', "console.error('warned')"], command: NODE, output: 'capture' });
    } finally {
      write.mockRestore();
    }
    expect(written).toEqual(['warned\n']);
  });

  it('captures nothing when the child inherits this process stdio', async () => {
    const { lines } = await runChild({ args: ['-e', ''], command: NODE, output: 'inherit' });
    expect(lines).toEqual([]);
  });

  it('reports empty output when the child inherits this process stdio', async () => {
    const { output } = await runChild({ args: ['-e', ''], command: NODE, output: 'inherit' });
    expect(output).toBe('');
  });
});

describe('runChild redaction', () => {
  it('redacts a captured line before it reaches the sink', async () => {
    const seen: string[] = [];
    await runChild({
      args: ['-e', "console.log('uri mongodb://u:pw@h/db here')"],
      command: NODE,
      output: 'capture',
      redactLine: (line) => line.replaceAll('mongodb://u:pw@h/db', '***'),
      writeErr: () => {},
      writeOut: (line) => seen.push(line),
    });
    expect(seen).toEqual(['uri *** here']);
  });

  /**
   * The reason capture is line-buffered rather than chunk-forwarded: the two
   * halves of a secret arrive in separate `data` events, and a per-chunk
   * redaction would forward the first half verbatim.
   */
  it('redacts a secret split across two chunks', async () => {
    const seen: string[] = [];
    await runChild({
      args: [
        '-e',
        "process.stdout.write('uri mongodb://u:'); setTimeout(() => process.stdout.write('pw@h/db here\\n'), 50)",
      ],
      command: NODE,
      output: 'capture',
      redactLine: (line) => line.replaceAll('mongodb://u:pw@h/db', '***'),
      writeErr: () => {},
      writeOut: (line) => seen.push(line),
    });
    expect(seen).toEqual(['uri *** here']);
  });

  it('redacts the flushed trailing line as well', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', "process.stdout.write('secret')"],
      command: NODE,
      redactLine: (line) => line.replaceAll('secret', '***'),
    });
    expect(lines).toEqual(['***']);
  });
});

describe('runChild timeout', () => {
  it('kills a child that outlives its timeout', async () => {
    const { signal } = await runChild({
      ...captureOnly,
      args: ['-e', SLEEPS],
      command: NODE,
      detached: true,
      timeoutMs: 300,
    });
    expect(signal).toBe('SIGKILL');
  });

  it('leaves a child that finishes in time alone', async () => {
    const { code } = await runChild({
      ...captureOnly,
      args: ['-e', 'process.exit(0)'],
      command: NODE,
      timeoutMs: 30_000,
    });
    expect(code).toBe(0);
  });
});

describe('startChild process group', () => {
  /**
   * `pnpm` is only ever the entry point — the work happens in the tsx/next
   * grandchild it spawns. Killing the direct child alone orphans that
   * grandchild, which is why children spawn detached and the kill targets
   * the negative pid (the whole group).
   */
  it('reaps a grandchild when the group is killed', async () => {
    const pids: number[] = [];
    const handle = startChild({
      args: ['-e', SPAWNS_A_GRANDCHILD],
      command: NODE,
      detached: true,
      output: 'capture',
      writeErr: () => {},
      writeOut: (line) => pids.push(Number(line)),
    });
    await vi.waitFor(() => {
      expect(pids).toHaveLength(1);
    });
    const [grandchild] = pids;
    try {
      handle.kill('SIGKILL');
      await handle.closed;
      await expect.poll(() => isAlive(grandchild)).toBe(false);
    } finally {
      if (isAlive(grandchild)) {
        process.kill(grandchild, 'SIGKILL');
      }
    }
  }, 20_000);

  it('kills an attached child without touching the group', async () => {
    const handle = startChild({ ...captureOnly, args: ['-e', SLEEPS], command: NODE });
    handle.kill('SIGKILL');
    const { signal } = await handle.closed;
    expect(signal).toBe('SIGKILL');
  });

  it('ignores a kill aimed at a child that already exited', async () => {
    const handle = startChild({ ...captureOnly, args: ['-e', ''], command: NODE });
    await handle.closed;
    expect(() => handle.kill('SIGKILL')).not.toThrow();
  });

  it('ignores a kill aimed at a child that never started', async () => {
    const handle = startChild({ ...captureOnly, command: 'mkelley33-no-such-binary' });
    await handle.closed;
    expect(() => handle.kill('SIGKILL')).not.toThrow();
  });
});

describe('startChild streams', () => {
  it('hands the caller the raw stdout stream in pipe mode', async () => {
    const handle = startChild({
      args: ['-e', "console.log('piped')"],
      command: NODE,
      output: 'pipe',
    });
    let piped = '';
    handle.stdout?.on('data', (chunk: Buffer) => {
      piped += chunk.toString('utf8');
    });
    await handle.closed;
    expect(piped).toBe('piped\n');
  });

  it('hands the caller the raw stderr stream in pipe mode', async () => {
    const handle = startChild({
      args: ['-e', "console.error('piped')"],
      command: NODE,
      output: 'pipe',
    });
    let piped = '';
    handle.stderr?.on('data', (chunk: Buffer) => {
      piped += chunk.toString('utf8');
    });
    await handle.closed;
    expect(piped).toBe('piped\n');
  });

  it('exposes no streams when the child inherits this process stdio', () => {
    const handle = startChild({ args: ['-e', ''], command: NODE, output: 'inherit' });
    expect(handle.stdout).toBeNull();
  });
});

describe('runChild environment', () => {
  it('runs the child in the requested working directory', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', 'console.log(process.cwd())'],
      command: NODE,
      cwd: '/',
    });
    expect(lines).toEqual(['/']);
  });

  /**
   * Exactly, not merged: the E2E harness pins every env-sensitive key, and a
   * silent merge with this process's environment would be the hole that lets
   * a developer's DATABASE_URL through.
   */
  it('gives the child exactly the env it was handed', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', 'console.log(process.env.E2E_FIXTURE, process.env.HOME === undefined)'],
      command: NODE,
      env: { E2E_FIXTURE: 'pinned', NODE_ENV: 'test' },
    });
    expect(lines).toEqual(['pinned true']);
  });

  /** How git drives a hook: the whole ref list, then EOF. */
  it('feeds the child its stdin and closes it', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: [
        '-e',
        "let read = ''; process.stdin.setEncoding('utf8');" +
          "process.stdin.on('data', (chunk) => { read += chunk; });" +
          "process.stdin.on('end', () => console.log(read.trim().toUpperCase()));",
      ],
      command: NODE,
      input: 'one ref line\n',
    });
    expect(lines).toEqual(['ONE REF LINE']);
  });

  it('hands the child a real pipe when asked for one', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', IS_STDIN_DEV_NULL],
      command: NODE,
      stdin: 'pipe',
    });
    expect(lines).toEqual(['false']);
  });

  /** The db tools read their input from a config file, never from stdin. */
  it('gives the child no stdin at all when asked to ignore it', async () => {
    const { lines } = await runChild({
      ...captureOnly,
      args: ['-e', IS_STDIN_DEV_NULL],
      command: NODE,
      stdin: 'ignore',
    });
    expect(lines).toEqual(['true']);
  });
});
