/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A Seed file's text. Capture writes each file through this, so that the
 * same content always gives the same bytes: a Capture of a site nobody has
 * edited leaves `git diff` empty, and one after an edit shows that edit and
 * nothing else.
 *
 * Two things make it so. Keys are sorted, because the order the database
 * hands them back in depends on how a record was last saved. And the text
 * is formatted by Prettier with the repo's own settings, so the gate's
 * format check passes on what Capture wrote.
 */

import path from 'node:path';

import { format, resolveConfig } from 'prettier';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** By code unit, not by locale: the same on every machine. */
const byKey = ([a]: [string, unknown], [b]: [string, unknown]): number => (a < b ? -1 : 1);

const sorted = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sorted);
  }
  return isRecord(value)
    ? Object.fromEntries(
        Object.entries(value)
          .sort(byKey)
          .map(([key, held]) => [key, sorted(held)])
      )
    : value;
};

/**
 * A file in the repo's own Seed, to ask Prettier for the settings that
 * apply there. The Seed always lives in the repo, wherever a spec writes it.
 */
const IN_THE_SEED = path.resolve('seed', 'seed.json');

/** The text of a Seed file holding `value`. */
export const toSeedJson = async (value: unknown): Promise<string> => {
  const options = await resolveConfig(IN_THE_SEED);
  // Indented first: Prettier keeps an object open that was written open.
  return format(JSON.stringify(sorted(value), null, 2), { ...options, parser: 'json' });
};
