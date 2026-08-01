/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { join } from 'node:path';

import {
  archiveFileName,
  isArchiveName,
  latestArchive,
  missingBackupEnv,
  mongodumpArgs,
  mongorestoreArgs,
  redactSecrets,
  resolveBackupDir,
  toolsConfigContents,
} from '@/lib/db-backup';

describe('missingBackupEnv', () => {
  it('names DATABASE_URL when it is unset', () => {
    expect(missingBackupEnv({})).toEqual(['DATABASE_URL']);
  });

  it('returns nothing when DATABASE_URL is set', () => {
    expect(missingBackupEnv({ DATABASE_URL: 'mongodb://localhost/db' })).toEqual([]);
  });
});

describe('resolveBackupDir', () => {
  it('defaults to backups/mkelley33 under the home directory', () => {
    expect(resolveBackupDir({}, '/Users/someone')).toBe(
      join('/Users/someone', 'backups', 'mkelley33')
    );
  });

  it('prefers DB_BACKUP_DIR when set', () => {
    expect(resolveBackupDir({ DB_BACKUP_DIR: '/mnt/dumps' }, '/Users/someone')).toBe('/mnt/dumps');
  });
});

describe('archiveFileName', () => {
  it('embeds a colon-free UTC instant and the archive suffix', () => {
    const instant = new Date('2026-08-01T17:30:05.123Z');
    expect(archiveFileName(instant)).toBe('mkelley33-2026-08-01T17-30-05.123Z.archive.gz');
  });
});

describe('isArchiveName', () => {
  it('accepts a name produced by archiveFileName', () => {
    expect(isArchiveName(archiveFileName(new Date('2026-08-01T00:00:00.000Z')))).toBe(true);
  });

  it('rejects unrelated directory entries', () => {
    expect(isArchiveName('.DS_Store')).toBe(false);
  });

  it('rejects a name with a stray prefix', () => {
    expect(isArchiveName('old-mkelley33-2026-08-01T00-00-00.000Z.archive.gz')).toBe(false);
  });
});

describe('latestArchive', () => {
  it('picks the newest archive regardless of input order', () => {
    const oldest = archiveFileName(new Date('2026-07-30T08:00:00.000Z'));
    const middle = archiveFileName(new Date('2026-07-31T09:15:00.000Z'));
    const newest = archiveFileName(new Date('2026-08-01T07:45:00.000Z'));
    expect(latestArchive([middle, newest, oldest])).toBe(newest);
  });

  it('ignores entries that are not archives', () => {
    const only = archiveFileName(new Date('2026-08-01T07:45:00.000Z'));
    expect(latestArchive(['.DS_Store', only, 'notes.txt'])).toBe(only);
  });

  it('returns undefined when no archive is present', () => {
    expect(latestArchive(['.DS_Store'])).toBeUndefined();
  });
});

describe('toolsConfigContents', () => {
  it('renders the uri as a quoted YAML scalar', () => {
    expect(toolsConfigContents('mongodb://localhost:27017/db')).toBe(
      'uri: "mongodb://localhost:27017/db"\n'
    );
  });

  it('escapes backslashes and double quotes in the uri', () => {
    expect(toolsConfigContents('mongodb://u:p"w\\d@host/db')).toBe(
      'uri: "mongodb://u:p\\"w\\\\d@host/db"\n'
    );
  });
});

describe('mongodumpArgs', () => {
  it('reads the uri from the config file and writes a gzipped archive', () => {
    expect(mongodumpArgs({ archivePath: '/tmp/a.archive.gz', configPath: '/tmp/c.yaml' })).toEqual([
      '--config=/tmp/c.yaml',
      '--archive=/tmp/a.archive.gz',
      '--gzip',
    ]);
  });
});

describe('mongorestoreArgs', () => {
  it('restores the archive as a snapshot, dropping live collections first', () => {
    expect(
      mongorestoreArgs({ archivePath: '/tmp/a.archive.gz', configPath: '/tmp/c.yaml' })
    ).toEqual(['--config=/tmp/c.yaml', '--archive=/tmp/a.archive.gz', '--gzip', '--drop']);
  });
});

describe('redactSecrets', () => {
  it('replaces every occurrence of each secret with ***', () => {
    const uri = 'mongodb://user:hunter2@db.example.com/prod';
    const text = `connected to ${uri}\nretrying ${uri} after failure`;
    expect(redactSecrets(text, [uri])).toBe('connected to ***\nretrying *** after failure');
  });

  it('leaves text without secrets untouched', () => {
    expect(redactSecrets('dumped 42 documents', ['mongodb://x@y/z'])).toBe('dumped 42 documents');
  });

  it('ignores empty secrets instead of corrupting the text', () => {
    expect(redactSecrets('all good', [''])).toBe('all good');
  });
});
