/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { metadata } from '@/app/(site)/layout';
import { siteConfig } from '@/lib/site-config';

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
}));

describe('site layout metadata', () => {
  it('resolves relative metadata URLs against the production origin', () => {
    expect(String(metadata.metadataBase)).toBe(`${siteConfig.url}/`);
  });

  it('gives every page a self-referencing canonical', () => {
    // './' resolves per request pathname, so /blog/foo canonicalizes to
    // itself rather than to the homepage.
    expect(metadata.alternates?.canonical).toBe('./');
  });

  it('keeps the RSS feed alternate', () => {
    expect(metadata.alternates?.types?.['application/rss+xml']).toBe('/feed.xml');
  });
});
