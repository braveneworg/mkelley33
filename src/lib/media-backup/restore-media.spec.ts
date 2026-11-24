/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { backupMedia } from '@/lib/media-backup/backup-media';
import type { BlobStore } from '@/lib/media-backup/blob-store';
import { fakeBlobStore, fakeFile } from '@/lib/media-backup/fake-blob-store';
import { restoreMedia } from '@/lib/media-backup/restore-media';

const NOW = new Date('2026-11-23T10:00:00.000Z');

let backupDir: string;
let snapshotDir: string;

beforeEach(async () => {
  backupDir = mkdtempSync(path.join(tmpdir(), 'media-restore-'));
  // A real snapshot, written by the backup the restore has to read.
  ({ snapshotDir } = await backupMedia({
    backupDir,
    now: NOW,
    store: fakeBlobStore({
      'headshot-a1B2c3.webp': fakeFile('a headshot', 'image/webp'),
      'posts/cover-d4E5f6.png': fakeFile('a cover'),
    }),
  }));
});

afterEach(() => {
  rmSync(backupDir, { force: true, recursive: true });
});

describe('restoreMedia', () => {
  it('puts every file of the snapshot into an empty store', async () => {
    const store = fakeBlobStore();

    await restoreMedia({ snapshotDir, store });

    expect([...store.contents.keys()]).toEqual(['headshot-a1B2c3.webp', 'posts/cover-d4E5f6.png']);
  });

  it('restores each file with its bytes and its content type', async () => {
    const store = fakeBlobStore();

    await restoreMedia({ snapshotDir, store });

    expect(store.contents.get('headshot-a1B2c3.webp')).toEqual(
      fakeFile('a headshot', 'image/webp')
    );
  });

  it('replaces a file the store has under the same pathname', async () => {
    const store = fakeBlobStore({ 'headshot-a1B2c3.webp': fakeFile('something else') });

    await restoreMedia({ snapshotDir, store });

    expect(store.contents.get('headshot-a1B2c3.webp')).toEqual(
      fakeFile('a headshot', 'image/webp')
    );
  });

  it('leaves alone a file the snapshot does not have', async () => {
    const store = fakeBlobStore({ 'newer-g7H8i9.png': fakeFile('uploaded since') });

    await restoreMedia({ snapshotDir, store });

    expect(store.contents.get('newer-g7H8i9.png')).toEqual(fakeFile('uploaded since'));
  });

  it('reports the files it restored and the ones it left alone', async () => {
    const store = fakeBlobStore({ 'newer-g7H8i9.png': fakeFile('uploaded since') });

    await expect(restoreMedia({ snapshotDir, store })).resolves.toEqual({
      leftAlone: ['newer-g7H8i9.png'],
      restored: ['headshot-a1B2c3.webp', 'posts/cover-d4E5f6.png'],
    });
  });

  it('names each file as it is restored', async () => {
    const restored: string[] = [];

    await restoreMedia({
      onFile: (pathname) => restored.push(pathname),
      snapshotDir,
      store: fakeBlobStore(),
    });

    expect(restored).toEqual(['headshot-a1B2c3.webp', 'posts/cover-d4E5f6.png']);
  });

  describe('when a file in the snapshot has changed since the backup', () => {
    beforeEach(() => {
      writeFileSync(path.join(snapshotDir, 'files', 'posts', 'cover-d4E5f6.png'), 'tampered');
    });

    it('fails and says which file', async () => {
      await expect(restoreMedia({ snapshotDir, store: fakeBlobStore() })).rejects.toThrow(
        'posts/cover-d4E5f6.png is not the file that was backed up — its bytes have changed.'
      );
    });

    it('uploads nothing, not even the files that are intact', async () => {
      const store = fakeBlobStore();

      await restoreMedia({ snapshotDir, store }).catch(() => undefined);

      expect(store.contents.size).toBe(0);
    });
  });

  it('fails when a file the manifest lists is missing', async () => {
    rmSync(path.join(snapshotDir, 'files', 'headshot-a1B2c3.webp'));

    await expect(restoreMedia({ snapshotDir, store: fakeBlobStore() })).rejects.toThrow(
      'The snapshot has no file for headshot-a1B2c3.webp.'
    );
  });

  it('fails when the directory holds no manifest', async () => {
    rmSync(path.join(snapshotDir, 'manifest.json'));

    await expect(restoreMedia({ snapshotDir, store: fakeBlobStore() })).rejects.toThrow(
      `${snapshotDir} is not a snapshot — it has no manifest.json.`
    );
  });

  it('refuses a manifest that names a file outside the snapshot', async () => {
    writeFileSync(
      path.join(snapshotDir, 'manifest.json'),
      JSON.stringify({
        createdAt: NOW.toISOString(),
        files: [
          {
            contentType: 'text/plain',
            pathname: '../manifest.json',
            sha256: 'a'.repeat(64),
            size: 1,
            uploadedAt: NOW.toISOString(),
          },
        ],
        version: 1,
      })
    );

    await expect(restoreMedia({ snapshotDir, store: fakeBlobStore() })).rejects.toThrow(
      'The file ../manifest.json has a name that leaves the snapshot.'
    );
  });

  describe('when the store fails part-way', () => {
    const failingOnSecond = (): { store: BlobStore; written: string[] } => {
      const written: string[] = [];
      const store = fakeBlobStore();
      return {
        store: {
          ...store,
          write: (upload) => {
            if (upload.pathname === 'posts/cover-d4E5f6.png') {
              return Promise.reject(new Error('Storage answered 503.'));
            }
            written.push(upload.pathname);
            return store.write(upload);
          },
        },
        written,
      };
    };

    it('says how far it got and that running it again is safe', async () => {
      const { store } = failingOnSecond();

      await expect(restoreMedia({ snapshotDir, store })).rejects.toThrow(
        'Restored 1 of 2 files, then posts/cover-d4E5f6.png failed — Storage answered 503. ' +
          'Running the restore again is safe.'
      );
    });

    it('keeps the files it had already restored', async () => {
      const { store, written } = failingOnSecond();

      await restoreMedia({ snapshotDir, store }).catch(() => undefined);

      expect(written).toEqual(['headshot-a1B2c3.webp']);
    });
  });
});
