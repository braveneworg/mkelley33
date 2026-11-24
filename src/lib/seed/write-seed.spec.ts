/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { fingerprint } from '@/lib/seed/capture-files';
import type { Captured } from '@/lib/seed/capture-seed';
import { loadSeed } from '@/lib/seed/seed-files';
import { knownSeedFiles, writeSeed } from '@/lib/seed/write-seed';

const { directory: _, ...content } = loadSeed('seed');

const bytes = (text: string): Buffer => Buffer.from(text);

/** The committed Seed's content, with files of this spec's own. */
const captured = (files: Record<string, string>): Captured => ({
  content,
  files: new Map(Object.entries(files).map(([name, text]) => [name, bytes(text)])),
  leftOut: [],
});

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'written-seed-'));
});

afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

describe('writeSeed', () => {
  it('writes a Seed that reads back as what it was given', async () => {
    await writeSeed(directory, captured({}));

    expect(loadSeed(directory)).toEqual({ ...content, directory });
  });

  it('writes every file under its name', async () => {
    await writeSeed(directory, captured({ 'files/a.png': 'a picture' }));

    expect(readFileSync(path.join(directory, 'files/a.png'), 'utf8')).toBe('a picture');
  });

  it('replaces a file whose bytes have changed', async () => {
    await writeSeed(directory, captured({ 'files/a.png': 'the old picture' }));

    await writeSeed(directory, captured({ 'files/a.png': 'the new picture' }));

    expect(readFileSync(path.join(directory, 'files/a.png'), 'utf8')).toBe('the new picture');
  });

  /** A Seed that kept a file the site no longer shows would go on publishing it. */
  it('removes a file the Seed no longer names', async () => {
    await writeSeed(directory, captured({ 'files/a.png': 'one', 'files/b.png': 'two' }));

    await writeSeed(directory, captured({ 'files/b.png': 'two' }));

    expect(readdirSync(path.join(directory, 'files'))).toEqual(['b.png']);
  });

  it('leaves a directory inside the files directory alone', async () => {
    mkdirSync(path.join(directory, 'files', 'kept'), { recursive: true });

    await writeSeed(directory, captured({}));

    expect(readdirSync(path.join(directory, 'files'))).toEqual(['kept']);
  });
});

describe('knownSeedFiles', () => {
  it('names each file the Seed holds by the fingerprint of its bytes', async () => {
    mkdirSync(path.join(directory, 'files'));
    writeFileSync(path.join(directory, 'files', 'a.png'), 'a picture');

    await expect(knownSeedFiles(directory)).resolves.toEqual(
      new Map([[fingerprint(bytes('a picture')), 'files/a.png']])
    );
  });

  it('knows nothing of a Seed that has no files yet', async () => {
    await expect(knownSeedFiles(directory)).resolves.toEqual(new Map());
  });
});
