/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Copies every file a blob store holds into a new snapshot on this machine
 * (`snapshot.ts` describes one). It reads the store and never writes to it.
 *
 * A snapshot is all or nothing. It is built under a name `media:restore`
 * will not pick up and renamed only once its last file and its manifest are
 * on disk, so a run that fails or is interrupted cannot leave something a
 * later restore would mistake for a good copy.
 */

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BlobStore, StoredBlob } from '@/lib/media-backup/blob-store';
import {
  MANIFEST_FILE,
  newManifest,
  PARTIAL_SUFFIX,
  type SnapshotFile,
  snapshotFilePath,
  snapshotName,
} from '@/lib/media-backup/snapshot';
import { fingerprint } from '@/lib/seed/capture-files';

export interface BackupMediaOptions {
  /** The directory snapshots are kept in; created when it is missing. */
  backupDir: string;
  now: Date;
  /** Called with a file's pathname once that file is on disk. */
  onFile?: (pathname: string) => void;
  store: BlobStore;
}

export interface BackupMediaResult {
  fileCount: number;
  snapshotDir: string;
  totalBytes: number;
}

const MANIFEST_INDENT = 2;

const byPathname = (a: StoredBlob, b: StoredBlob): number => (a.pathname < b.pathname ? -1 : 1);

const copyFile = async (
  store: BlobStore,
  directory: string,
  { pathname, size, uploadedAt, url }: StoredBlob
): Promise<SnapshotFile> => {
  // Resolved before anything is fetched, so a name that leaves the snapshot
  // costs no download.
  const target = snapshotFilePath(directory, pathname);
  const { bytes, contentType } = await store.read(url);
  if (bytes.length !== size) {
    throw new Error(
      `${pathname} arrived as ${String(bytes.length)} bytes where the store lists ${String(size)}.`
    );
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return { contentType, pathname, sha256: fingerprint(bytes), size, uploadedAt };
};

/** Writes a snapshot of everything `store` holds under `backupDir`. */
export const backupMedia = async ({
  backupDir,
  now,
  onFile,
  store,
}: BackupMediaOptions): Promise<BackupMediaResult> => {
  const blobs = [...(await store.list())].sort(byPathname);
  if (blobs.length === 0) {
    // An empty snapshot would become "the latest", and restoring it would
    // quietly do nothing. More likely the token names the wrong store.
    throw new Error('The store holds no files, so there is nothing to back up.');
  }
  const snapshotDir = path.join(backupDir, snapshotName(now));
  const partialDir = `${snapshotDir}${PARTIAL_SUFFIX}`;
  try {
    const files: SnapshotFile[] = [];
    // One at a time: the store limits how fast it may be read, and a
    // personal site's library is small enough not to need more.
    for (const blob of blobs) {
      files.push(await copyFile(store, partialDir, blob));
      onFile?.(blob.pathname);
    }
    await writeFile(
      path.join(partialDir, MANIFEST_FILE),
      `${JSON.stringify(newManifest(now, files), null, MANIFEST_INDENT)}\n`
    );
    await rename(partialDir, snapshotDir);
    return {
      fileCount: files.length,
      snapshotDir,
      totalBytes: files.reduce((total, { size }) => total + size, 0),
    };
  } catch (error) {
    // Best effort, and never allowed to replace the failure being reported —
    // see docs/lessons/seed/a-cleanup-must-not-outrank-the-failure.md.
    await rm(partialDir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
};
