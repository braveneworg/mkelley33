import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

interface FooterLink {
  href: string;
  label: string;
  rel: string;
}

const externalLinks = (): FooterLink[] => {
  const candidates: { href: string | null; label: string; rel: string }[] = [
    {
      href: siteConfig.socials.github,
      label: 'github',
      rel: 'me noopener noreferrer',
    },
    {
      href: siteConfig.socials.linkedin,
      label: 'linkedin',
      rel: 'me noopener noreferrer',
    },
    {
      href: siteConfig.socials.bluesky,
      label: 'bluesky',
      rel: 'me noopener noreferrer',
    },
    {
      href: siteConfig.repoUrl,
      label: 'source',
      rel: 'noopener noreferrer',
    },
  ];
  return candidates.filter((candidate): candidate is FooterLink => candidate.href !== null);
};

export const SiteFooter = () => (
  <footer className="border-edge border-t">
    <div className="text-fg-muted mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 font-mono text-xs">
      <p>
        <span aria-hidden="true">🄯</span> {new Date().getFullYear()} michaux kelley — copyleft,
        share alike
      </p>
      <ul className="ml-auto flex flex-wrap gap-x-4">
        {externalLinks().map((link) => (
          <li key={link.label}>
            {/* eslint-disable-next-line react/jsx-no-target-blank -- rel is
                data-driven so socials can carry rel="me"; every literal in the
                candidates list above includes "noopener noreferrer". */}
            <a
              className="link-draw hover:text-fg transition-colors"
              href={link.href}
              rel={link.rel}
              target="_blank"
            >
              {link.label}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <Link className="link-draw hover:text-fg transition-colors" href="/uses">
            uses
          </Link>
        </li>
        <li>
          <a className="link-draw hover:text-fg transition-colors" href="/feed.xml">
            rss
          </a>
        </li>
      </ul>
    </div>
  </footer>
);
