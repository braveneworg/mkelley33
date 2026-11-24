/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { check, resolveConfig } from 'prettier';

import { toSeedJson } from '@/lib/seed/seed-json';

const FILE = 'seed/pages.json';

describe('toSeedJson', () => {
  /** The database hands keys back in the order a record was last saved in. */
  it('gives the same text whatever order the keys arrive in', async () => {
    const one = await toSeedJson({ a: 1, b: { c: 2, d: 3 } });
    const other = await toSeedJson({ b: { d: 3, c: 2 }, a: 1 });

    expect(other).toBe(one);
  });

  it('keeps a list in the order it was given', async () => {
    const text = await toSeedJson([{ slug: 'uses' }, { slug: 'blog' }]);

    expect(JSON.parse(text)).toEqual([{ slug: 'uses' }, { slug: 'blog' }]);
  });

  it('writes an empty value as null rather than leaving it out', async () => {
    await expect(toSeedJson({ intro: null })).resolves.toBe('{\n  "intro": null\n}\n');
  });

  /** The gate's format check runs on the Seed, so Capture must write what it accepts. */
  it('passes the repo’s own format check', async () => {
    const text = await toSeedJson({
      blocks: [{ blockType: 'chipList', chips: ['one', 'two'], command: null }],
      slug: 'home',
    });
    const options = await resolveConfig(FILE);

    await expect(check(text, { ...options, filepath: FILE })).resolves.toBe(true);
  });
});
