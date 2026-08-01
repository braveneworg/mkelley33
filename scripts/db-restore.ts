/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Restores the database behind DATABASE_URL from a local archive written by
 * `db:backup` — the newest one in DB_BACKUP_DIR / `~/backups/mkelley33`, or
 * an explicit path: `pnpm run db:restore -- <archive>`. Restore means
 * "return to this snapshot": every collection in the archive is dropped and
 * replaced, so point DATABASE_URL carefully before running. Needs
 * `mongorestore` from the MongoDB Database Tools; the connection string
 * travels in a short-lived 0600 config file, never argv or output.
 */

import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import {
  latestArchive,
  missingBackupEnv,
  mongorestoreArgs,
  resolveBackupDir,
  toolsConfigContents,
} from '@/lib/db-backup';

import { runTool } from './db-tool-runner';

const resolveArchivePath = async (requested: string | undefined): Promise<string | undefined> => {
  if (requested !== undefined) {
    return requested;
  }
  const backupDir = resolveBackupDir({ DB_BACKUP_DIR: process.env.DB_BACKUP_DIR }, homedir());
  const entries = await readdir(backupDir).catch(() => []);
  const newest = latestArchive(entries);
  if (newest === undefined) {
    console.error(
      `db:restore found no archives in ${backupDir} — run \`pnpm run db:backup\` ` +
        'first, or pass one: pnpm run db:restore -- <archive>'
    );
    return undefined;
  }
  return join(backupDir, newest);
};

const run = async (): Promise<void> => {
  const { DATABASE_URL } = process.env;
  const missing = missingBackupEnv({ DATABASE_URL });
  if (missing.length > 0 || DATABASE_URL === undefined) {
    console.error(`db:restore missing env — set ${missing.join(' and ')}`);
    process.exit(1);
  }
  const archivePath = await resolveArchivePath(process.argv[2]);
  if (archivePath === undefined) {
    process.exit(1);
  }
  const readable = await stat(archivePath).then(
    (stats) => stats.isFile(),
    () => false
  );
  if (!readable) {
    console.error(`db:restore cannot read ${archivePath}`);
    process.exit(1);
  }
  console.info(`db:restore replacing collections from ${basename(archivePath)}`);
  const configDir = await mkdtemp(join(tmpdir(), 'db-restore-'));
  const configPath = join(configDir, 'tools-config.yaml');
  await writeFile(configPath, toolsConfigContents(DATABASE_URL), { mode: 0o600 });
  try {
    const code = await runTool('mongorestore', mongorestoreArgs({ archivePath, configPath }), [
      DATABASE_URL,
    ]);
    if (code !== 0) {
      console.error(`db:restore failed — mongorestore exited with ${code}`);
      process.exit(1);
    }
  } finally {
    await rm(configDir, { force: true, recursive: true });
  }
  console.info(`db:restore done — restored ${archivePath}`);
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(`db:restore failed — ${String(error)}`);
  process.exit(1);
});
