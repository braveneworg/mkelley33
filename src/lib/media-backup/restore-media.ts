/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Puts the files of a snapshot back into a blob store, each under the
 * pathname it had, replacing a file the store has under the same pathname.
 *
 * It never deletes. A file the store has and the snapshot does not — one
 * uploaded since the backup — is left where it is and reported: a record in
 * the database may point at it, and nothing here can know. That makes the
 * restore safe to run twice and safe to run against a store that is mostly
 * intact.
 *
 * Nothing is uploaded until every file of the snapshot has been read and
 * found to be the file that was backed up.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { BlobStore } from '@/lib/media-backup/blob-store';
import {
  MANIFEST_FILE,
  parseManifest,
  type SnapshotFile,
  snapshotFilePath,
  type SnapshotManifest,
} from '@/lib/media-backup/snapshot';
import { fingerprint } from '@/lib/seed/capture-files';

export interface RestoreMediaOptions {
  /** Called with a file's pathname once the store has it. */
  onFile?: (pathname: string) => void;
  snapshotDir: string;
  store: BlobStore;
}

export interface RestoreMediaResult {
  /** Pathnames the store holds that the snapshot does not. Untouched. */
  leftAlone: string[];
  restored: string[];
}

interface LocatedFile extends SnapshotFile {
  /** Where the snapshot keeps the file on this machine. */
  location: string;
}

const readManifest = async (snapshotDir: string): Promise<SnapshotManifest> => {
  const json = await readFile(path.join(snapshotDir, MANIFEST_FILE), 'utf8').catch(() => undefined);
  if (json === undefined) {
    throw new Error(`${snapshotDir} is not a snapshot — it has no ${MANIFEST_FILE}.`);
  }
  return parseManifest(json);
};

/** The file's bytes, once they are known to be the ones that were backed up. */
const readIntact = async ({ location, pathname, sha256 }: LocatedFile): Promise<Buffer> => {
  const bytes = await readFile(location).catch(() => undefined);
  if (bytes === undefined) {
    throw new Error(`The snapshot has no file for ${pathname}.`);
  }
  if (fingerprint(bytes) !== sha256) {
    throw new Error(`${pathname} is not the file that was backed up — its bytes have changed.`);
  }
  return bytes;
};

const withoutFullStop = (message: string): string => message.replace(/\.$/, '');

/** Puts every file of the snapshot in `snapshotDir` back into `store`. */
export const restoreMedia = async ({
  onFile,
  snapshotDir,
  store,
}: RestoreMediaOptions): Promise<RestoreMediaResult> => {
  const { files } = await readManifest(snapshotDir);
  const located = files.map((file): LocatedFile => ({
    ...file,
    location: snapshotFilePath(snapshotDir, file.pathname),
  }));
  for (const file of located) {
    await readIntact(file);
  }
  // Asked before the first upload, so a token the store refuses stops the
  // run with nothing written.
  const inSnapshot = new Set(located.map(({ pathname }) => pathname));
  const leftAlone = (await store.list())
    .map(({ pathname }) => pathname)
    .filter((pathname) => !inSnapshot.has(pathname))
    .sort();
  const restored: string[] = [];
  for (const file of located) {
    const { contentType, pathname } = file;
    try {
      // Read again and checked again, so what is uploaded is what was verified.
      await store.write({ bytes: await readIntact(file), contentType, pathname });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Restored ${String(restored.length)} of ${String(located.length)} files, then ` +
          `${pathname} failed — ${withoutFullStop(reason)}. Running the restore again is safe.`,
        { cause: error }
      );
    }
    restored.push(pathname);
    onFile?.(pathname);
  }
  return { leftAlone, restored };
};
