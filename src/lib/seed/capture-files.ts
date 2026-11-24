/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The files a Capture collects, and what each is called in the Seed.
 *
 * Storage renames an upload, so the name a file has in the database says
 * little: the Seed's `headshot.webp` is stored on the live site under a
 * name with a random tail. A file is therefore known by its bytes. One the
 * Seed already holds keeps the name it has there, so capturing a site whose
 * pictures have not changed renames nothing; a new one takes its stored
 * name, tidied to what the Seed allows.
 */

import { createHash } from 'node:crypto';
import path from 'node:path';

import { isSeedPicture, SEED_FILES } from '@/lib/seed/seed-values';

/** What tells two files apart: a digest of their bytes. */
export const fingerprint = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

/** Anything but letters, digits, `_` and `-`, which is all a Seed file name may hold. */
const NOT_PLAIN = /[^\w-]+/g;

/** A stored file name as the Seed would write it, under `files/`. */
const tidied = (storedName: string): string => {
  const { ext, name } = path.parse(storedName);
  return `${SEED_FILES}${name.replace(NOT_PLAIN, '-')}${ext.toLowerCase()}`;
};

/** True when the Seed can carry a picture stored under this name. */
export const isCarriedPicture = (storedName: string): boolean => isSeedPicture(tidied(storedName));

/** `files/a.webp` → `files/a-2.webp`, and so on. */
const numbered = (name: string, count: number): string => {
  const { dir, ext, name: base } = path.parse(name);
  return `${dir}/${base}-${String(count)}${ext}`;
};

export interface CapturedFiles {
  /**
   * Takes a file in and resolves to its name in the Seed (`files/…`). The
   * same bytes always get the same name, however often they are added.
   */
  readonly add: (bytes: Buffer, storedName: string) => string;
  /** Takes a file in under a name the Seed fixes, such as the Resume's. */
  readonly addAs: (bytes: Buffer, name: string) => string;
  /** Every file collected, by its name in the Seed. */
  readonly all: () => ReadonlyMap<string, Buffer>;
}

/**
 * Starts a collection. `known` is what the Seed holds now: the name of each
 * of its files, by the fingerprint of its bytes.
 */
export const captureFiles = (known: ReadonlyMap<string, string> = new Map()): CapturedFiles => {
  const files = new Map<string, Buffer>();
  const names = new Map<string, string>();

  /** The first of `name`, `name-2`, `name-3`… that no other file has taken. */
  const free = (name: string): string => {
    let candidate = name;
    for (let count = 2; files.has(candidate); count += 1) {
      candidate = numbered(name, count);
    }
    return candidate;
  };

  const keep = (bytes: Buffer, wanted: string): string => {
    const print = fingerprint(bytes);
    const name = names.get(print) ?? free(wanted);
    names.set(print, name);
    files.set(name, bytes);
    return name;
  };

  return {
    add: (bytes, storedName) => keep(bytes, known.get(fingerprint(bytes)) ?? tidied(storedName)),
    addAs: (bytes, name) => {
      files.set(name, bytes);
      return name;
    },
    all: () => files,
  };
};
