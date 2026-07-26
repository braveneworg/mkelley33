import Link from 'next/link';

import { siteConfig } from '@/lib/site-config';

interface FooterLink {
  href: string;
  label: string;
  rel: string;
}

function externalLinks(): FooterLink[] {
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
  return candidates.filter(
    (candidate): candidate is FooterLink => candidate.href !== null,
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-6 font-mono text-xs text-fg-muted">
        <p>
          🄯 {new Date().getFullYear()} michaux kelley — copyleft, share alike
        </p>
        <ul className="ml-auto flex flex-wrap gap-x-4">
          {externalLinks().map((link) => (
            <li key={link.label}>
              <a
                className="transition-colors hover:text-fg"
                href={link.href}
                rel={link.rel}
                target="_blank"
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link className="transition-colors hover:text-fg" href="/uses">
              uses
            </Link>
          </li>
          <li>
            <a className="transition-colors hover:text-fg" href="/feed.xml">
              rss
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
