/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A media snapshot as it sits on the owner's disk, and the pure decisions
 * around it — where it goes, what it is called, what its manifest must look
 * like. `backup-media.ts` writes one and `restore-media.ts` reads one; the
 * side effects live there.
 *
 * A snapshot is a directory:
 *
 *     mkelley33-media-<utc-instant>/
 *       manifest.json     what the store held, file by file
 *       files/<pathname>  each file, under the pathname the store had it at
 *
 * The pathname is the whole point. Payload stores only a file's name and
 * asks the store for it by that name, so a file put back under the name it
 * had is found again by every record that pointed at it.
 */

import path from 'node:path';

import { z } from 'zod';

export interface MediaBackupEnv {
  BLOB_READ_WRITE_TOKEN?: string;
}

export const MANIFEST_FILE = 'manifest.json';
export const FILES_DIRECTORY = 'files';
/** What a snapshot is called until its last file and its manifest are written. */
export const PARTIAL_SUFFIX = '.partial';

const MANIFEST_VERSION = 1;

/** Colon-free UTC instant, as in a database archive's name. */
const SNAPSHOT_NAME = /^mkelley33-media-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/;
const SHA_256 = /^[0-9a-f]{64}$/;

const snapshotFileSchema = z.strictObject({
  contentType: z.string().min(1),
  pathname: z.string().min(1),
  sha256: z.string().regex(SHA_256),
  size: z.number().int().nonnegative(),
  uploadedAt: z.iso.datetime(),
});

const manifestSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  files: z.array(snapshotFileSchema),
  version: z.literal(MANIFEST_VERSION),
});

/** One file of a snapshot: where the store had it and what it must still be. */
export type SnapshotFile = z.infer<typeof snapshotFileSchema>;
export type SnapshotManifest = z.infer<typeof manifestSchema>;

/**
 * Presence-only check, mirroring `missingBackupEnv` — the value is a secret,
 * so only the missing NAME can ever appear in output.
 */
export const missingMediaBackupEnv = ({ BLOB_READ_WRITE_TOKEN }: MediaBackupEnv): string[] =>
  BLOB_READ_WRITE_TOKEN ? [] : ['BLOB_READ_WRITE_TOKEN'];

export const snapshotName = (now: Date): string =>
  `mkelley33-media-${now.toISOString().replaceAll(':', '-')}`;

/** True only for a finished snapshot: an unfinished one still carries its suffix. */
export const isSnapshotName = (name: string): boolean => SNAPSHOT_NAME.test(name);

/**
 * The embedded timestamps are fixed-width, so lexicographic order is
 * chronological order — no date parsing needed.
 */
export const latestSnapshot = (names: readonly string[]): string | undefined =>
  names.filter(isSnapshotName).sort().at(-1);

export const newManifest = (now: Date, files: SnapshotFile[]): SnapshotManifest => ({
  createdAt: now.toISOString(),
  files,
  version: MANIFEST_VERSION,
});

/**
 * The manifest a snapshot holds, or an error that says what is wrong with
 * it. A manifest is read from disk long after it was written, possibly by a
 * later version of this code, so nothing in it is taken on trust.
 */
export const parseManifest = (json: string): SnapshotManifest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The manifest is not JSON.');
  }
  const result = manifestSchema.safeParse(parsed);
  if (!result.success) {
    const [issue] = result.error.issues;
    const where = issue?.path.join('.');
    throw new Error(
      `The manifest is not one media:backup wrote — ${[where, issue?.message].filter(Boolean).join(': ')}`
    );
  }
  return result.data;
};

/**
 * Where a snapshot keeps the file the store had at `pathname`. A pathname
 * comes from the store or from a manifest read off disk, so one that would
 * resolve outside the snapshot's `files/` is refused, not followed.
 */
export const snapshotFilePath = (snapshotDir: string, pathname: string): string => {
  const directory = path.resolve(snapshotDir, FILES_DIRECTORY);
  const file = path.resolve(directory, ...pathname.split('/'));
  if (!file.startsWith(directory + path.sep)) {
    throw new Error(`The file ${pathname} has a name that leaves the snapshot.`);
  }
  return file;
};
