import Link from 'next/link';

import { Magnetic } from '@/components/motion/magnetic';
import { ButtonLink } from '@/components/ui/button-link';
import { siteConfig } from '@/lib/site-config';

export function Hero() {
  return (
    <section className="scanlines bg-blueprint">
      <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-28">
        <p aria-hidden="true" className="typewriter font-mono text-sm text-phosphor">
          $ whoami
        </p>
        <h1 className="mt-4 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          {siteConfig.name}
        </h1>
        <p className="mt-3 font-mono text-lg text-phosphor">
          {siteConfig.tagline}
        </p>
        <p className="mt-5 max-w-xl leading-relaxed text-fg-muted">
          # 10+ years of production React, Next.js &amp; Node — deployed forward
          with Claude Code, MCP &amp; friends
        </p>
        <div className="mt-8 flex flex-wrap gap-4 font-mono text-sm">
          <Magnetic>
            <ButtonLink href="/blog">Read the blog →</ButtonLink>
          </Magnetic>
          <Link
            className="rounded border border-edge px-4 py-2 text-fg-muted transition-colors hover:text-fg"
            href="/contact"
          >
            Work with me
          </Link>
        </div>
      </div>
    </section>
  );
}
