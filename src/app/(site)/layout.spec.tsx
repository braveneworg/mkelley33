/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { generateMetadata, HTML_CLASSES, MAIN_CLASSES, viewport } from '@/app/(site)/layout';
import { siteConfig } from '@/lib/site-config';
import { makeSiteSettings } from '@/test/make-site-settings';

vi.mock('@/lib/repositories/site-settings', () => ({
  getSiteSettings: vi.fn(async () => makeSiteSettings()),
}));

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono' }),
}));

describe('site layout metadata', () => {
  it('resolves relative metadata URLs against the production origin', async () => {
    const metadata = await generateMetadata();

    expect(String(metadata.metadataBase)).toBe(`${siteConfig.url}/`);
  });

  it('gives every page a self-referencing canonical', async () => {
    // './' resolves per request pathname, so /blog/foo canonicalizes to
    // itself rather than to the homepage.
    const metadata = await generateMetadata();

    expect(metadata.alternates?.canonical).toBe('./');
  });

  it('keeps the RSS feed alternate', async () => {
    const metadata = await generateMetadata();

    expect(metadata.alternates?.types?.['application/rss+xml']).toBe('/feed.xml');
  });

  it('takes the browser title from Site settings', async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toEqual({ default: 'a browser title', template: '%s · mkelley33' });
  });

  it('takes the description from Site settings', async () => {
    const metadata = await generateMetadata();

    expect(metadata.description).toBe('a site description');
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

describe('site layout html element', () => {
  it('pads anchor scrolling so a jumped-to section clears the sticky header', () => {
    // 5rem clears the one-row phone header (the menu folds behind a
    // hamburger); 6rem clears the taller desktop row with room to spare.
    expect(HTML_CLASSES.split(' ')).toEqual(['scroll-pt-20', 'sm:scroll-pt-24']);
  });
});
