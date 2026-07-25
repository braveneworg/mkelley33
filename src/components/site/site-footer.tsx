import { siteConfig } from '@/lib/site-config';

interface FooterLink {
  href: string;
  label: string;
}

function externalLinks(): FooterLink[] {
  const candidates: { href: string | null; label: string }[] = [
    { href: siteConfig.socials.github, label: 'github' },
    { href: siteConfig.socials.linkedin, label: 'linkedin' },
    { href: siteConfig.socials.bluesky, label: 'bluesky' },
    { href: siteConfig.repoUrl, label: 'source' },
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
                rel="me noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
