/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  mongoPortArgs,
  nodeVersionFromMise,
  projectName,
  runInToolchainArgs,
  startMongoArgs,
  tearDownArgs,
} from '@/lib/harness/compose';

const PROJECT = 'mkelley33-e2e-4242';

/** What every compose invocation starts with, whatever it goes on to do. */
const PREFIX = [
  'compose',
  '--project-name',
  PROJECT,
  '--file',
  'docker/compose.yaml',
  '--env-file',
  '/dev/null',
];

describe('projectName', () => {
  /**
   * One project per run: `pnpm build:ci` and `pnpm e2e`, or the same command
   * in two worktrees, must never share — or tear down — each other's Mongo.
   */
  it('is unique to the command and the process running it', () => {
    expect(projectName('e2e', 4242)).toBe(PROJECT);
  });

  it('differs between the two commands in one process', () => {
    expect(projectName('build', 4242)).not.toBe(projectName('e2e', 4242));
  });
});

describe('every compose command', () => {
  const commands = [
    runInToolchainArgs(PROJECT, ['pnpm', 'e2e']),
    startMongoArgs(PROJECT),
    mongoPortArgs(PROJECT),
    tearDownArgs(PROJECT),
  ];

  it.each(commands)('names the project and the compose file first (%#)', (...args) => {
    expect(args.slice(0, PREFIX.length)).toEqual(PREFIX);
  });

  /**
   * Compose reads a `.env` beside the compose file or in the working
   * directory to fill in `${…}` references. Pointing it at an empty file
   * means it opens no env file of ours at all.
   */
  it.each(commands)('stops compose from loading a default .env file (%#)', (...args) => {
    expect(args[args.indexOf('--env-file') + 1]).toBe('/dev/null');
  });
});

describe('runInToolchainArgs', () => {
  const args = runInToolchainArgs(PROJECT, ['pnpm', 'exec', 'tsx', 'scripts/e2e.ts']);

  it('runs the command in the toolchain service', () => {
    expect(args.slice(PREFIX.length)).toEqual([
      'run',
      '--rm',
      '--build',
      '--no-TTY',
      'toolchain',
      'pnpm',
      'exec',
      'tsx',
      'scripts/e2e.ts',
    ]);
  });

  /** Without it a run would test whatever source the last build happened to copy in. */
  it('rebuilds the image from the current working tree', () => {
    expect(args).toContain('--build');
  });
});

describe('startMongoArgs', () => {
  it('starts only Mongo and waits until it is healthy', () => {
    expect(startMongoArgs(PROJECT).slice(PREFIX.length)).toEqual([
      'up',
      '--detach',
      '--wait',
      'mongo',
    ]);
  });
});

describe('mongoPortArgs', () => {
  it('asks where Mongo was published', () => {
    expect(mongoPortArgs(PROJECT).slice(PREFIX.length)).toEqual(['port', 'mongo', '27017']);
  });
});

describe('tearDownArgs', () => {
  /**
   * `--rmi local` removes the image this project built. Each run builds
   * under its own project name, so without it every run would leave a tagged
   * image behind; the layers stay in the build cache either way.
   */
  it('removes the containers, the network, the volumes and the image it built', () => {
    expect(tearDownArgs(PROJECT).slice(PREFIX.length)).toEqual([
      'down',
      '--volumes',
      '--remove-orphans',
      '--rmi',
      'local',
    ]);
  });
});

describe('nodeVersionFromMise', () => {
  it('reads the node tool version', () => {
    expect(nodeVersionFromMise('[tools]\nnode = "24.22.1"\n')).toBe('24.22.1');
  });

  it('reads it past comments and other tools', () => {
    expect(nodeVersionFromMise('# pin\n[tools]\npnpm = "11.17.0"\nnode = "24.22.1"\n')).toBe(
      '24.22.1'
    );
  });

  /** An image tag needs an exact version; a range would build something unpinned. */
  it('throws when the file pins no exact node version', () => {
    expect(() => nodeVersionFromMise('[tools]\nnode = "24"\n')).toThrow('mise.toml');
  });
});
