/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Where a Capture meets the disk: reading what the Seed's `files` directory
 * holds now, and rewriting the Seed in place. The working tree is the only
 * thing it changes, so `git diff` is the review and `git restore` the undo.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fingerprint } from '@/lib/seed/capture-files';
import type { Captured } from '@/lib/seed/capture-seed';
import { SEED_JSON } from '@/lib/seed/seed-files';
import { toSeedJson } from '@/lib/seed/seed-json';
import { SEED_FILES } from '@/lib/seed/seed-values';

/** The names of the files directly inside the Seed's `files` directory. */
const fileNames = async (directory: string): Promise<string[]> => {
  const entries = await readdir(path.join(directory, SEED_FILES), { withFileTypes: true }).catch(
    () => []
  );
  return entries.filter((entry) => entry.isFile()).map(({ name }) => name);
};

/**
 * What the Seed in `directory` holds now: the name of each of its files
 * (`files/…`) by the fingerprint of its bytes. An empty map when it has none.
 */
export const knownSeedFiles = async (directory: string): Promise<Map<string, string>> => {
  const known = new Map<string, string>();
  for (const name of await fileNames(directory)) {
    const file = `${SEED_FILES}${name}`;
    known.set(fingerprint(await readFile(path.join(directory, file))), file);
  }
  return known;
};

/**
 * Rewrites the Seed in `directory` as `captured`: every file it names, each
 * JSON file, and nothing else — a file the new Seed no longer names is
 * removed, because a Seed that still held it would keep publishing it.
 */
export const writeSeed = async (directory: string, { content, files }: Captured): Promise<void> => {
  await mkdir(path.join(directory, SEED_FILES), { recursive: true });
  for (const [name, bytes] of files) {
    await writeFile(path.join(directory, name), bytes);
  }
  for (const name of await fileNames(directory)) {
    if (!files.has(`${SEED_FILES}${name}`)) {
      await rm(path.join(directory, SEED_FILES, name));
    }
  }
  const json = [
    [SEED_JSON.pages, content.pages],
    [SEED_JSON.posts, content.posts],
    [SEED_JSON.services, content.services],
    [SEED_JSON.siteSettings, content.siteSettings],
  ] as const;
  for (const [name, value] of json) {
    await writeFile(path.join(directory, name), await toSeedJson(value));
  }
};
