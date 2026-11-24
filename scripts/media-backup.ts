/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Copies every file in the blob store behind BLOB_READ_WRITE_TOKEN — the
 * pictures and the Resume files — into a new snapshot on this machine:
 * `<dir>/mkelley33-media-<utc-instant>/`, where `<dir>` is MEDIA_BACKUP_DIR
 * or `~/backups/mkelley33/media`. `pnpm run media:backup` loads `.env.local`
 * when present; shell values win.
 *
 * It reads the store and writes nothing to it. The database is not part of
 * a snapshot: run `pnpm run db:backup` alongside, because a record and the
 * file it points at only make sense together. The token goes to the SDK as
 * an option — never argv, never output — and is redacted from any failure
 * this prints.
 */

import { homedir } from 'node:os';

import { redactSecrets } from '@/lib/db-backup';
import { backupMedia } from '@/lib/media-backup/backup-media';
import { vercelBlobStore } from '@/lib/media-backup/blob-store';
import { missingMediaBackupEnv, resolveMediaBackupDir } from '@/lib/media-backup/snapshot';

const run = async (): Promise<void> => {
  const { BLOB_READ_WRITE_TOKEN } = process.env;
  const missing = missingMediaBackupEnv({ BLOB_READ_WRITE_TOKEN });
  if (missing.length > 0 || BLOB_READ_WRITE_TOKEN === undefined) {
    console.error(`media:backup missing env — set ${missing.join(' and ')}`);
    process.exit(1);
  }
  const backupDir = resolveMediaBackupDir(
    { MEDIA_BACKUP_DIR: process.env.MEDIA_BACKUP_DIR },
    homedir()
  );
  const { fileCount, snapshotDir, totalBytes } = await backupMedia({
    backupDir,
    now: new Date(),
    onFile: (pathname) => {
      console.info(`  ${pathname}`);
    },
    store: vercelBlobStore(BLOB_READ_WRITE_TOKEN),
  });
  console.info(
    `media:backup done — ${snapshotDir} (${String(fileCount)} files, ${String(totalBytes)} bytes)`
  );
  process.exit(0);
};

run().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(
    `media:backup failed — ${redactSecrets(reason, [process.env.BLOB_READ_WRITE_TOKEN ?? ''])}`
  );
  process.exit(1);
});
