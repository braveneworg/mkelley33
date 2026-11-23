/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readdirSync } from 'node:fs';

import { RESERVED_PAGE_SLUGS } from '@/lib/pages/page-address';

/**
 * A route the code serves one level deep must be a reserved name, or a Page
 * created under it would sit in the admin and never be shown: the code's
 * own route wins. This reads the route tree, so adding such a route without
 * reserving its name fails here.
 */

/** What a Page's address may look like — anything else cannot collide. */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** File routes Next serves at their bare name; the rest carry an extension. */
const BARE_FILE_ROUTE = /^(?:opengraph|twitter)-image\./;

const namesServedFrom = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      if (entry.isDirectory()) {
        return entry.name;
      }
      return BARE_FILE_ROUTE.test(entry.name) ? (entry.name.split('.')[0] ?? '') : '';
    })
    .filter((name) => SLUG.test(name));

describe('reserved Page names', () => {
  const served = [
    ...namesServedFrom('src/app'),
    ...namesServedFrom('src/app/(site)'),
    ...namesServedFrom('src/app/(payload)'),
  ]
    // `blog` holds only the route for a post; `/blog` itself is the blog Page.
    .filter((name) => name !== 'blog');

  it('cover every single-segment name the code serves', () => {
    expect(served.filter((name) => !RESERVED_PAGE_SLUGS.has(name)).sort()).toEqual([]);
  });

  it('find the routes they are meant to guard', () => {
    // If the walk above ever comes back empty, the check above passes vacuously.
    expect(served).toEqual(expect.arrayContaining(['admin', 'api', 'newsletter', 'preview']));
  });
});
