/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { MAIN_CLASSES, metadata, viewport } from '@/app/(site)/layout';
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

describe('site layout viewport', () => {
  it('pins the browser chrome color to the dark default before hydration', () => {
    // Dark is the site default regardless of OS preference, so the SSR'd
    // theme-color must not follow prefers-color-scheme — ThemeColorSync
    // re-stamps it after hydration only for visitors who chose light.
    expect(viewport.themeColor).toBe('#0b0f14');
  });
});

describe('site layout main element', () => {
  it('stays a stretched flex column so the consent trigger can pin to the bottom', () => {
    // The cookie trigger relies on `<main>` being a tall flex column: sticky
    // needs the stretched (`flex-1`) containing block, and `mt-auto` on the
    // trigger only reaches the bottom of short pages under `flex-col`.
    expect(MAIN_CLASSES.split(' ')).toEqual(['flex', 'flex-1', 'flex-col']);
  });
});
