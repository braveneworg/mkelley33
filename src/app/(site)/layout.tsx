import { Inter, JetBrains_Mono } from 'next/font/google';

import { Analytics } from '@vercel/analytics/next';

import { PaletteMount } from '@/components/palette/palette-mount';
import { SerwistRegister } from '@/components/site/serwist-register';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteNav } from '@/components/site/site-nav';
import { ThemeColorSync } from '@/components/site/theme-color-sync';
import { ThemeProvider } from '@/components/site/theme-provider';
import { serializeJsonLd } from '@/lib/json-ld';
import { siteConfig } from '@/lib/site-config';

import type { Metadata, Viewport } from 'next';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  alternates: {
    types: { 'application/rss+xml': '/feed.xml' },
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s · mkelley33',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { color: '#0b0f14', media: '(prefers-color-scheme: dark)' },
    { color: '#f4f7f5', media: '(prefers-color-scheme: light)' },
  ],
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  jobTitle: 'Full-Stack AI Forward Deployed Engineer',
  name: siteConfig.name,
  sameAs: [
    siteConfig.socials.github,
    siteConfig.socials.linkedin,
    ...(siteConfig.socials.bluesky ? [siteConfig.socials.bluesky] : []),
  ],
  url: siteConfig.url,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <a
          className="focus:border-phosphor focus:bg-surface sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:border focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
          href="#main"
        >
          skip to content
        </a>
        <SerwistRegister>
          <ThemeProvider>
            <div className="flex min-h-dvh flex-col">
              <SiteNav />
              <main className="flex-1" id="main">
                {children}
              </main>
              <SiteFooter />
            </div>
            <PaletteMount />
            <ThemeColorSync />
          </ThemeProvider>
          <script
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
            type="application/ld+json"
          />
        </SerwistRegister>
        <Analytics />
      </body>
    </html>
  );
}
