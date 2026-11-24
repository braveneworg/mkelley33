/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { join } from 'node:path';

import {
  isSnapshotName,
  latestSnapshot,
  missingMediaBackupEnv,
  parseManifest,
  resolveMediaBackupDir,
  snapshotFilePath,
  snapshotName,
  type SnapshotManifest,
} from '@/lib/media-backup/snapshot';

const manifest: SnapshotManifest = {
  createdAt: '2026-11-23T10:00:00.000Z',
  files: [
    {
      contentType: 'image/webp',
      pathname: 'headshot-a1B2c3.webp',
      sha256: 'a'.repeat(64),
      size: 9,
      uploadedAt: '2026-11-22T08:00:00.000Z',
    },
  ],
  version: 1,
};

describe('missingMediaBackupEnv', () => {
  it('names BLOB_READ_WRITE_TOKEN when it is unset', () => {
    expect(missingMediaBackupEnv({})).toEqual(['BLOB_READ_WRITE_TOKEN']);
  });

  it('names BLOB_READ_WRITE_TOKEN when it is empty', () => {
    expect(missingMediaBackupEnv({ BLOB_READ_WRITE_TOKEN: '' })).toEqual(['BLOB_READ_WRITE_TOKEN']);
  });

  it('returns nothing when BLOB_READ_WRITE_TOKEN is set', () => {
    expect(missingMediaBackupEnv({ BLOB_READ_WRITE_TOKEN: 'a-placeholder' })).toEqual([]);
  });
});

describe('resolveMediaBackupDir', () => {
  it('defaults to backups/mkelley33/media under the home directory', () => {
    expect(resolveMediaBackupDir({}, '/Users/someone')).toBe(
      join('/Users/someone', 'backups', 'mkelley33', 'media')
    );
  });

  it('prefers MEDIA_BACKUP_DIR when set', () => {
    expect(resolveMediaBackupDir({ MEDIA_BACKUP_DIR: '/mnt/media' }, '/Users/someone')).toBe(
      '/mnt/media'
    );
  });
});

describe('snapshotName', () => {
  it('embeds a colon-free UTC instant', () => {
    expect(snapshotName(new Date('2026-08-01T17:30:05.123Z'))).toBe(
      'mkelley33-media-2026-08-01T17-30-05.123Z'
    );
  });
});

describe('isSnapshotName', () => {
  it('accepts a name produced by snapshotName', () => {
    expect(isSnapshotName(snapshotName(new Date('2026-08-01T00:00:00.000Z')))).toBe(true);
  });

  it('rejects a snapshot that was never finished', () => {
    expect(isSnapshotName('mkelley33-media-2026-08-01T00-00-00.000Z.partial')).toBe(false);
  });

  it('rejects a database archive kept in the same directory', () => {
    expect(isSnapshotName('mkelley33-2026-08-01T00-00-00.000Z.archive.gz')).toBe(false);
  });
});

describe('latestSnapshot', () => {
  it('returns the newest snapshot whatever order the directory lists them in', () => {
    expect(
      latestSnapshot([
        'mkelley33-media-2026-08-02T00-00-00.000Z',
        'mkelley33-media-2026-11-23T09-00-00.000Z',
        'mkelley33-media-2026-08-01T00-00-00.000Z',
      ])
    ).toBe('mkelley33-media-2026-11-23T09-00-00.000Z');
  });

  it('ignores everything that is not a finished snapshot', () => {
    expect(
      latestSnapshot([
        '.DS_Store',
        'mkelley33-media-2026-08-01T00-00-00.000Z',
        'mkelley33-media-2026-12-01T00-00-00.000Z.partial',
      ])
    ).toBe('mkelley33-media-2026-08-01T00-00-00.000Z');
  });

  it('returns undefined when the directory holds no snapshot', () => {
    expect(latestSnapshot(['.DS_Store'])).toBeUndefined();
  });
});

describe('parseManifest', () => {
  it('reads back a manifest it was given as JSON', () => {
    expect(parseManifest(JSON.stringify(manifest))).toEqual(manifest);
  });

  it('refuses text that is not JSON', () => {
    expect(() => parseManifest('{ not json')).toThrow('The manifest is not JSON.');
  });

  it('refuses a manifest of a version it does not know', () => {
    expect(() => parseManifest(JSON.stringify({ ...manifest, version: 2 }))).toThrow(
      /^The manifest is not one media:backup wrote — version/
    );
  });

  it('refuses a file whose digest is not a SHA-256', () => {
    const [file] = manifest.files;
    const damaged = { ...manifest, files: [{ ...file, sha256: 'abc' }] };

    expect(() => parseManifest(JSON.stringify(damaged))).toThrow(
      /^The manifest is not one media:backup wrote — files\.0\.sha256/
    );
  });

  it('refuses a field it does not know', () => {
    expect(() => parseManifest(JSON.stringify({ ...manifest, extra: true }))).toThrow(
      /^The manifest is not one media:backup wrote/
    );
  });
});

describe('snapshotFilePath', () => {
  it('puts a file under the snapshot’s files directory', () => {
    expect(snapshotFilePath('/backups/snap', 'headshot-a1B2c3.webp')).toBe(
      join('/backups/snap', 'files', 'headshot-a1B2c3.webp')
    );
  });

  it('keeps the folders a pathname carries', () => {
    expect(snapshotFilePath('/backups/snap', 'posts/2026/cover.png')).toBe(
      join('/backups/snap', 'files', 'posts', '2026', 'cover.png')
    );
  });

  it('refuses a pathname that climbs out of the snapshot', () => {
    expect(() => snapshotFilePath('/backups/snap', '../../.ssh/authorized_keys')).toThrow(
      'The file ../../.ssh/authorized_keys has a name that leaves the snapshot.'
    );
  });

  it('refuses a pathname that names the files directory itself', () => {
    expect(() => snapshotFilePath('/backups/snap', '.')).toThrow(
      'The file . has a name that leaves the snapshot.'
    );
  });
});
