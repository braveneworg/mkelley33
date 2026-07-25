import type { Metadata, Viewport } from 'next';

import { Inter, JetBrains_Mono } from 'next/font/google';

import { SiteFooter } from '@/components/site/site-footer';
import { SiteNav } from '@/components/site/site-nav';
import { ThemeProvider } from '@/components/site/theme-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
};

export const viewport: Viewport = {
  themeColor: [
    { color: '#0b0f14', media: '(prefers-color-scheme: dark)' },
    { color: '#f4f7f5', media: '(prefers-color-scheme: light)' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteNav />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
