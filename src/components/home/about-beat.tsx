import Image from 'next/image';

import { TerminalSection } from '@/components/home/terminal-section';
import { siteConfig } from '@/lib/site-config';

export const AboutBeat = ({
  headshotSrc = siteConfig.headshot,
}: {
  headshotSrc?: string | null;
}) => (
  <TerminalSection command="cat ./about.md">
    <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {headshotSrc ? (
          <Image
            alt={siteConfig.name}
            className="border-edge rounded-full border"
            height={120}
            src={headshotSrc}
            width={120}
          />
        ) : (
          <div className="border-edge text-fg-muted flex size-30 items-center justify-center rounded-full border border-dashed p-2 text-center font-mono text-xs">
            # headshot: pending
          </div>
        )}
      </div>
      <div className="text-fg max-w-2xl space-y-4 leading-relaxed">
        <p>
          I&apos;m Michaux — a senior full-stack engineer with 10+ years shipping production React,
          Next.js, and Node.js for healthcare, security, retail, and marketplace platforms. I
          specialize in accessible, performant UI at scale, disciplined testing, and AWS cloud
          architecture.
        </p>
        <p>
          Lately I work forward-deployed: bringing AI-assisted development — Claude Code, Copilot,
          MCP servers, prompt and context engineering — into real teams and real codebases.
        </p>
        <p className="text-fg-muted">
          Away from the terminal: music, meditation, and a steady diet of non-fiction.
        </p>
      </div>
    </div>
  </TerminalSection>
);
