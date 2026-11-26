/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Inter, JetBrains_Mono } from 'next/font/google';

import { ConsentBanner } from '@/components/consent/consent-banner';
import { ConsentCookieTrigger } from '@/components/consent/consent-cookie-trigger';
import { ConsentModeScript } from '@/components/consent/consent-mode-script';
import { ConsentPreferencesDialog } from '@/components/consent/consent-preferences-dialog';
import { ConsentProvider } from '@/components/consent/consent-provider';
import { PaletteHotkey } from '@/components/palette/palette-hotkey';
import { PaletteMount } from '@/components/palette/palette-mount';
import { palettePages } from '@/components/palette/palette-pages';
import { GoogleAnalyticsTag } from '@/components/site/google-analytics-tag';
import { PreviewBanner } from '@/components/site/preview-banner';
import { SerwistRegister } from '@/components/site/serwist-register';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteNav } from '@/components/site/site-nav';
import { ThemeColorSync } from '@/components/site/theme-color-sync';
import { ThemeProvider } from '@/components/site/theme-provider';
import { VercelAnalyticsTag } from '@/components/site/vercel-analytics-tag';
import { feedAlternateTypes } from '@/lib/feed-alternates';
import { serializeJsonLd } from '@/lib/json-ld';
import { isPreviewing } from '@/lib/pages/preview';
import { listPublishedPages } from '@/lib/repositories/pages';
import { getSiteSettings } from '@/lib/repositories/site-settings';
import { siteConfig } from '@/lib/site-config';
import { listSocialLinks, type SiteSettingsContent } from '@/lib/site-settings-content';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

/**
 * A function rather than a constant: the browser title and description are
 * Site settings, which live in the database (docs/adr/0001).
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const { description, title } = await getSiteSettings();
  return {
    alternates: {
      // './' resolves against the request pathname, so every page gets a
      // self-referencing canonical (e.g. /blog/foo → siteConfig.url/blog/foo).
      // Except the root: its internal pathname is '/index', so the homepage
      // pins its own canonical in (site)/page.tsx.
      canonical: './',
      types: feedAlternateTypes,
    },
    description,
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      template: '%s · mkelley33',
    },
    twitter: { card: 'summary_large_image' },
  };
};

export const viewport: Viewport = {
  // Dark is the default theme regardless of OS preference, so the SSR'd
  // theme-color is pinned dark; ThemeColorSync re-stamps it after hydration
  // for visitors who explicitly chose light.
  themeColor: '#0b0f14',
};

/**
 * `flex flex-col` is a load-bearing prerequisite, not styling: the consent
 * cookie trigger is `<main>`'s last child with `mt-auto`, which only pins it
 * to the bottom of short pages while `<main>` is a flex column. Exported so
 * the layout spec can pin the classes without rendering the tree.
 */
export const MAIN_CLASSES = 'flex flex-1 flex-col';

/**
 * Fragment jumps (skip link, /services#slug) stop clear of the sticky header:
 * 5rem over the one-row phone header (~53px, links behind the hamburger),
 * 6rem over the desktop row.
 */
export const HTML_CLASSES = 'scroll-pt-20 sm:scroll-pt-24';

/** The schema.org Person the layout publishes on every page. */
interface PersonJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Person';
  jobTitle: string;
  name: string;
  sameAs: string[];
  url: string;
}

const personJsonLd = ({ name, socials }: SiteSettingsContent): PersonJsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  jobTitle: 'Full-Stack AI Forward Deployed Engineer',
  name,
  sameAs: listSocialLinks(socials).map(({ url }) => url),
  url: siteConfig.url,
});

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, pages, previewing] = await Promise.all([
    getSiteSettings(),
    listPublishedPages(),
    isPreviewing(),
  ]);
  return (
    <html className={HTML_CLASSES} lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <PaletteHotkey />
        <a
          className="focus:border-phosphor focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:border focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
          href="#main"
        >
          skip to content
        </a>
        <SerwistRegister>
          <ThemeProvider>
            <ConsentProvider>
              <div className="flex min-h-dvh flex-col">
                {previewing ? <PreviewBanner /> : null}
                <SiteNav links={settings.headerMenu} />
                {/* tabIndex={-1}: older Safari won't move sequential focus past
                    the skip link's target unless it is programmatically
                    focusable. */}
                {/* A flex column, not a plain block: `flex-1` already
                    stretches `main` past short content, and only a flex
                    formatting context lets the trigger's `mt-auto` claim that
                    leftover height instead of stranding the cookie mid-page.
                    Every route's own root is a full-width block, so becoming a
                    flex item changes nothing above it. */}
                <main className={MAIN_CLASSES} id="main" tabIndex={-1}>
                  {children}
                  {/* Inside `<main>`, not beside it: the trigger is sticky, and
                      sticky resolves against the parent box — only this tall
                      one lets it ride the viewport and then park above the
                      footer. */}
                  <ConsentCookieTrigger />
                </main>
                <SiteFooter settings={settings} />
              </div>
              <PaletteMount pages={palettePages(pages)} socials={settings.socials} />
              <ThemeColorSync />
              <ConsentBanner />
              <ConsentPreferencesDialog />
              <VercelAnalyticsTag />
              <GoogleAnalyticsTag />
            </ConsentProvider>
          </ThemeProvider>
          <script
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd(settings)) }}
            type="application/ld+json"
          />
        </SerwistRegister>
        <ConsentModeScript />
      </body>
    </html>
  );
}
