/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { backupMedia } from '@/lib/media-backup/backup-media';
import type { BlobStore } from '@/lib/media-backup/blob-store';
import { fakeBlobStore, fakeFile } from '@/lib/media-backup/fake-blob-store';
import { parseManifest } from '@/lib/media-backup/snapshot';
import { fingerprint } from '@/lib/seed/capture-files';

const NOW = new Date('2026-11-23T10:00:00.000Z');
const SNAPSHOT = 'mkelley33-media-2026-11-23T10-00-00.000Z';

let backupDir: string;

beforeEach(() => {
  backupDir = mkdtempSync(path.join(tmpdir(), 'media-backup-'));
});

afterEach(() => {
  rmSync(backupDir, { force: true, recursive: true });
});

const twoFiles = (): BlobStore =>
  fakeBlobStore({
    'headshot-a1B2c3.webp': fakeFile('a headshot', 'image/webp'),
    'posts/cover-d4E5f6.png': fakeFile('a cover'),
  });

describe('backupMedia', () => {
  it('writes the snapshot into a directory named for the instant', async () => {
    const { snapshotDir } = await backupMedia({ backupDir, now: NOW, store: twoFiles() });

    expect(snapshotDir).toBe(path.join(backupDir, SNAPSHOT));
  });

  it('copies every file under the pathname the store has it at', async () => {
    const { snapshotDir } = await backupMedia({ backupDir, now: NOW, store: twoFiles() });

    expect(readFileSync(path.join(snapshotDir, 'files', 'posts', 'cover-d4E5f6.png'), 'utf8')).toBe(
      'a cover'
    );
  });

  it('records what a restore needs to put each file back', async () => {
    const { snapshotDir } = await backupMedia({ backupDir, now: NOW, store: twoFiles() });

    expect(parseManifest(readFileSync(path.join(snapshotDir, 'manifest.json'), 'utf8'))).toEqual({
      createdAt: '2026-11-23T10:00:00.000Z',
      files: [
        {
          contentType: 'image/webp',
          pathname: 'headshot-a1B2c3.webp',
          sha256: fingerprint(Buffer.from('a headshot')),
          size: 10,
          uploadedAt: '2026-11-22T08:00:00.000Z',
        },
        {
          contentType: 'image/png',
          pathname: 'posts/cover-d4E5f6.png',
          sha256: fingerprint(Buffer.from('a cover')),
          size: 7,
          uploadedAt: '2026-11-22T08:00:00.000Z',
        },
      ],
      version: 1,
    });
  });

  it('reports how many files and bytes it copied', async () => {
    const result = await backupMedia({ backupDir, now: NOW, store: twoFiles() });

    expect(result).toMatchObject({ fileCount: 2, totalBytes: 17 });
  });

  it('names each file as it is copied', async () => {
    const copied: string[] = [];

    await backupMedia({
      backupDir,
      now: NOW,
      onFile: (pathname) => copied.push(pathname),
      store: twoFiles(),
    });

    expect(copied).toEqual(['headshot-a1B2c3.webp', 'posts/cover-d4E5f6.png']);
  });

  it('copies the files in pathname order, whatever order the store lists them in', async () => {
    const copied: string[] = [];
    const store = fakeBlobStore({
      'c.png': fakeFile('c'),
      'a.png': fakeFile('a'),
      'b.png': fakeFile('b'),
    });

    await backupMedia({ backupDir, now: NOW, onFile: (pathname) => copied.push(pathname), store });

    expect(copied).toEqual(['a.png', 'b.png', 'c.png']);
  });

  it('leaves nothing unfinished behind once it is done', async () => {
    await backupMedia({ backupDir, now: NOW, store: twoFiles() });

    expect(readdirSync(backupDir)).toEqual([SNAPSHOT]);
  });

  it('refuses to write a snapshot of an empty store', async () => {
    await expect(backupMedia({ backupDir, now: NOW, store: fakeBlobStore() })).rejects.toThrow(
      'The store holds no files, so there is nothing to back up.'
    );
  });

  it('writes nothing for an empty store', async () => {
    await backupMedia({ backupDir, now: NOW, store: fakeBlobStore() }).catch(() => undefined);

    expect(readdirSync(backupDir)).toEqual([]);
  });

  describe('when a file arrives at a different size than the store listed', () => {
    const truncating = (): BlobStore => {
      const store = twoFiles();
      return { ...store, read: () => Promise.resolve(fakeFile('a head')) };
    };

    it('fails and says which file', async () => {
      await expect(backupMedia({ backupDir, now: NOW, store: truncating() })).rejects.toThrow(
        'headshot-a1B2c3.webp arrived as 6 bytes where the store lists 10.'
      );
    });

    it('keeps no part of the snapshot', async () => {
      await backupMedia({ backupDir, now: NOW, store: truncating() }).catch(() => undefined);

      expect(readdirSync(backupDir)).toEqual([]);
    });
  });

  describe('when the store fails part-way', () => {
    const failingOnSecond = (): BlobStore => {
      const store = twoFiles();
      return {
        ...store,
        read: (url) =>
          url.endsWith('cover-d4E5f6.png')
            ? Promise.reject(new Error('Storage answered 503.'))
            : store.read(url),
      };
    };

    it('reports the store’s failure', async () => {
      await expect(backupMedia({ backupDir, now: NOW, store: failingOnSecond() })).rejects.toThrow(
        'Storage answered 503.'
      );
    });

    it('keeps no part of the snapshot', async () => {
      await backupMedia({ backupDir, now: NOW, store: failingOnSecond() }).catch(() => undefined);

      expect(readdirSync(backupDir)).toEqual([]);
    });
  });

  it('refuses a pathname that would be written outside the snapshot', async () => {
    const store = fakeBlobStore({ '../escaped.png': fakeFile('a picture') });

    await expect(backupMedia({ backupDir, now: NOW, store })).rejects.toThrow(
      'The file ../escaped.png has a name that leaves the snapshot.'
    );
  });
});
