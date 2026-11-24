/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Puts the files of a snapshot written by `media:backup` back into the blob
 * store behind BLOB_READ_WRITE_TOKEN — the newest snapshot in BACKUP_DIR /
 * `~/projects/braveneworg/backups/mkelley33`, or an explicit one:
 * `pnpm run media:restore -- <snapshot directory>`.
 *
 * Every file goes back under the pathname it had, replacing a file the
 * store has under that pathname. Nothing is deleted: a file uploaded since
 * the backup stays, and is listed at the end. Running it twice is safe.
 * This writes to whichever store the token names, so check the token
 * before running. The token goes to the SDK as an option — never argv,
 * never output — and is redacted from any failure this prints.
 */

import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

import { redactSecrets, requestedPath, resolveBackupDir } from '@/lib/db-backup';
import { vercelBlobStore } from '@/lib/media-backup/blob-store';
import { restoreMedia } from '@/lib/media-backup/restore-media';
import { latestSnapshot, missingMediaBackupEnv } from '@/lib/media-backup/snapshot';

const resolveSnapshotDir = async (requested: string | undefined): Promise<string | undefined> => {
  if (requested !== undefined) {
    return requested;
  }
  const backupDir = resolveBackupDir({ BACKUP_DIR: process.env.BACKUP_DIR }, homedir());
  const entries = await readdir(backupDir).catch(() => []);
  const newest = latestSnapshot(entries);
  if (newest === undefined) {
    console.error(
      `media:restore found no snapshots in ${backupDir} — run \`pnpm run media:backup\` ` +
        'first, or pass one: pnpm run media:restore -- <snapshot directory>'
    );
    return undefined;
  }
  return join(backupDir, newest);
};

const run = async (): Promise<void> => {
  const { BLOB_READ_WRITE_TOKEN } = process.env;
  const missing = missingMediaBackupEnv({ BLOB_READ_WRITE_TOKEN });
  if (missing.length > 0 || BLOB_READ_WRITE_TOKEN === undefined) {
    console.error(`media:restore missing env — set ${missing.join(' and ')}`);
    process.exit(1);
  }
  const snapshotDir = await resolveSnapshotDir(requestedPath(process.argv.slice(2)));
  if (snapshotDir === undefined) {
    process.exit(1);
  }
  const readable = await stat(snapshotDir).then(
    (stats) => stats.isDirectory(),
    () => false
  );
  if (!readable) {
    console.error(`media:restore cannot read ${snapshotDir}`);
    process.exit(1);
  }
  console.info(`media:restore putting back the files of ${basename(snapshotDir)}`);
  const { leftAlone, restored } = await restoreMedia({
    onFile: (pathname) => {
      console.info(`  ${pathname}`);
    },
    snapshotDir,
    store: vercelBlobStore(BLOB_READ_WRITE_TOKEN),
  });
  console.info(
    `media:restore done — restored ${String(restored.length)} files from ${snapshotDir}`
  );
  if (leftAlone.length > 0) {
    console.info(
      `media:restore left alone ${String(leftAlone.length)} files the snapshot does not have:`
    );
    for (const pathname of leftAlone) {
      console.info(`  ${pathname}`);
    }
  }
  process.exit(0);
};

run().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `media:restore failed — ${redactSecrets(reason, [process.env.BLOB_READ_WRITE_TOKEN ?? ''])}`
  );
  process.exit(1);
});
