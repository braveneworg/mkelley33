/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { metadata } from '@/app/(site)/page';

vi.mock('@/lib/repositories/posts', () => ({
  listPublishedPosts: vi.fn(async () => []),
}));

describe('homepage metadata', () => {
  it('pins the canonical to the site root', () => {
    // The root route's internal pathname is '/index', so the layout's
    // relative './' canonical would resolve to /index here.
    expect(metadata.alternates?.canonical).toBe('/');
  });

  it('keeps the RSS feed alternate the layout would otherwise provide', () => {
    // A page-level `alternates` replaces the layout's object wholesale, so
    // the override must carry the feed alternate too.
    expect(metadata.alternates?.types?.['application/rss+xml']).toBe('/feed.xml');
  });
});
