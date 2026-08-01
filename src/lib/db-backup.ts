/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { join } from 'node:path';

/**
 * Pure decisions for `scripts/db-backup.ts` / `scripts/db-restore.ts` —
 * naming, argv construction, and redaction live here so they are unit-tested,
 * while the wrappers keep the side effects (fs, spawn). The mongodump /
 * mongorestore URI travels in a --config file rather than on argv so the
 * connection string (credentials included) never shows up in `ps` output or
 * shell history; nothing in this module ever returns a secret inside a
 * message.
 */

export interface BackupEnv {
  DATABASE_URL?: string;
}

export interface BackupDirEnv {
  DB_BACKUP_DIR?: string;
}

export interface ArchiveToolArgs {
  archivePath: string;
  configPath: string;
}

/** Colon-free UTC instant so the name is valid on every filesystem. */
const ARCHIVE_NAME = /^mkelley33-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.archive\.gz$/;

/**
 * Presence-only check, mirroring `missingSeedEnv` — the value itself is a
 * secret, so only the missing NAME can ever appear in output.
 */
export const missingBackupEnv = ({ DATABASE_URL }: BackupEnv): string[] =>
  DATABASE_URL ? [] : ['DATABASE_URL'];

export const resolveBackupDir = ({ DB_BACKUP_DIR }: BackupDirEnv, home: string): string =>
  DB_BACKUP_DIR ?? join(home, 'backups', 'mkelley33');

export const archiveFileName = (now: Date): string =>
  `mkelley33-${now.toISOString().replaceAll(':', '-')}.archive.gz`;

export const isArchiveName = (name: string): boolean => ARCHIVE_NAME.test(name);

/**
 * The embedded timestamps are fixed-width, so lexicographic order is
 * chronological order — no date parsing needed.
 */
export const latestArchive = (names: readonly string[]): string | undefined =>
  names.filter(isArchiveName).sort().at(-1);

/**
 * Contents of the throwaway `--config` file the tools read the uri from —
 * a double-quoted YAML scalar, so any character the connection string can
 * contain survives verbatim.
 */
export const toolsConfigContents = (uri: string): string =>
  `uri: "${uri.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"\n`;

export const mongodumpArgs = ({ archivePath, configPath }: ArchiveToolArgs): string[] => [
  `--config=${configPath}`,
  `--archive=${archivePath}`,
  '--gzip',
];

/**
 * `--drop` makes restore mean "return to this snapshot": each collection in
 * the archive replaces its live counterpart instead of merging into it.
 */
export const mongorestoreArgs = ({ archivePath, configPath }: ArchiveToolArgs): string[] => [
  `--config=${configPath}`,
  `--archive=${archivePath}`,
  '--gzip',
  '--drop',
];

/**
 * Belt-and-braces for echoed child output: the tools are not expected to
 * print the uri, but if one ever does, every occurrence is replaced before
 * the text reaches a terminal or log.
 */
export const redactSecrets = (text: string, secrets: readonly string[]): string =>
  secrets
    .filter((secret) => secret !== '')
    .reduce((redacted, secret) => redacted.replaceAll(secret, '***'), text);
