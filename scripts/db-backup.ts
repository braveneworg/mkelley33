/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Dumps the database behind DATABASE_URL to a gzipped archive on this
 * machine: `<dir>/mkelley33-<utc-instant>.archive.gz`, where `<dir>` is
 * DB_BACKUP_DIR or `~/backups/mkelley33`. `pnpm run db:backup` loads
 * `.env.local` when present; shell values win. Needs `mongodump` from the
 * MongoDB Database Tools. The connection string reaches the tool through a
 * short-lived 0600 config file — never argv, never output — and is redacted
 * from anything the tool prints.
 */

import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  archiveFileName,
  missingBackupEnv,
  mongodumpArgs,
  resolveBackupDir,
  toolsConfigContents,
} from '@/lib/db-backup';

import { runTool } from './db-tool-runner';

const run = async (): Promise<void> => {
  const { DATABASE_URL } = process.env;
  const missing = missingBackupEnv({ DATABASE_URL });
  if (missing.length > 0 || DATABASE_URL === undefined) {
    console.error(`db:backup missing env — set ${missing.join(' and ')}`);
    process.exit(1);
  }
  const backupDir = resolveBackupDir({ DB_BACKUP_DIR: process.env.DB_BACKUP_DIR }, homedir());
  await mkdir(backupDir, { recursive: true });
  const archivePath = join(backupDir, archiveFileName(new Date()));
  const configDir = await mkdtemp(join(tmpdir(), 'db-backup-'));
  const configPath = join(configDir, 'tools-config.yaml');
  await writeFile(configPath, toolsConfigContents(DATABASE_URL), { mode: 0o600 });
  try {
    const code = await runTool('mongodump', mongodumpArgs({ archivePath, configPath }), [
      DATABASE_URL,
    ]);
    if (code !== 0) {
      // A failed dump can leave a partial archive behind — never keep one a
      // later db:restore could mistake for a good snapshot.
      await rm(archivePath, { force: true });
      console.error(`db:backup failed — mongodump exited with ${code}`);
      process.exit(1);
    }
  } finally {
    await rm(configDir, { force: true, recursive: true });
  }
  const { size } = await stat(archivePath);
  console.info(`db:backup done — ${archivePath} (${size} bytes)`);
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`db:backup failed — ${String(error)}`);
  process.exit(1);
});
