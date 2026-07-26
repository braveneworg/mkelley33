import type { Metadata } from 'next';

import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  description:
    'Hardware, editor, terminal, AI toolbox, and stack defaults — what I actually use.',
  title: 'uses',
};

interface UsesEntry {
  name: string;
  note: string;
}

interface UsesSection {
  entries: UsesEntry[];
  heading: string;
}

const SECTIONS: UsesSection[] = [
  {
    entries: [
      {
        name: 'MacBook Pro (Apple silicon)',
        note: 'The daily driver — everything below runs here.',
      },
    ],
    heading: 'hardware',
  },
  {
    entries: [
      { name: 'VS Code', note: 'Primary editor, Claude Code extension always open.' },
      { name: 'Claude Code CLI', note: 'Agentic work: refactors, tests, whole features.' },
      { name: 'Windsurf / Cascade', note: 'Agentic IDE — piloted it at enterprise scale.' },
      { name: 'zsh', note: 'With too many aliases to admit to.' },
      { name: 'JetBrains Mono', note: 'The only font on this site you are not reading right now.' },
    ],
    heading: 'editor & terminal',
  },
  {
    entries: [
      { name: 'Claude Code', note: 'Daily driver for agentic engineering.' },
      { name: 'GitHub Copilot', note: 'Inline completions and PR review.' },
      {
        name: 'MCP servers',
        note: 'Context7, SequentialThinking, Figma, Memory, Markitdown, chrome-devtools.',
      },
      {
        name: 'Skills',
        note: 'obra/superpowers, mattpocock/skills, and custom-built.',
      },
      {
        name: 'Prompt & context engineering',
        note: 'The discipline that makes the rest of this list work.',
      },
    ],
    heading: 'ai toolbox',
  },
  {
    entries: [
      { name: 'TypeScript (strict)', note: 'Non-negotiable.' },
      { name: 'React 19 + Next.js App Router', note: 'Server Components first.' },
      { name: 'Tailwind CSS 4', note: 'CSS-first tokens.' },
      { name: 'MongoDB Atlas', note: 'Via Payload or Prisma, per project.' },
      { name: 'Vitest + React Testing Library', note: '90%+ coverage, enforced in CI.' },
      { name: 'Playwright', note: 'E2E for the flows that pay the bills.' },
      { name: 'pnpm', note: 'Fast, strict, disk-friendly.' },
    ],
    heading: 'stack defaults',
  },
  {
    entries: [
      {
        name: 'Next.js 16 · React 19 · Payload 3 · Tailwind 4 · Shiki · Vercel',
        note: 'This site, end to end — and it is open source.',
      },
    ],
    heading: "this site's stack",
  },
];

export default function UsesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> cat ./uses.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        # Uses
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
        The hardware, software, and AI tooling behind the work.
      </p>
      {SECTIONS.map((section) => (
        <section className="mt-10" key={section.heading}>
          <h2 className="font-mono text-lg font-bold text-phosphor">
            {section.heading}/
          </h2>
          <ul className="mt-4 max-w-2xl space-y-3">
            {section.entries.map((entry) => (
              <li key={entry.name}>
                <p className="font-mono text-sm text-fg">{entry.name}</p>
                <p className="text-sm text-fg-muted">{entry.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {siteConfig.repoUrl ? (
        <p className="mt-12 font-mono text-sm text-fg-muted">
          #{' '}
          <a
            className="text-phosphor underline underline-offset-4"
            href={siteConfig.repoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            view source on github
          </a>
        </p>
      ) : null}
    </div>
  );
}
