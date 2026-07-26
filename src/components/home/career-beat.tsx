import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { CV_EXPERIENCE } from '@/lib/cv-content';

export function CareerBeat() {
  return (
    <TerminalSection command="git log --career">
      <ol className="space-y-3">
        {CV_EXPERIENCE.map((entry) => (
          <li
            className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm"
            key={entry.hash}
          >
            <span className="text-phosphor">{entry.hash}</span>
            <span className="text-fg">
              {entry.role} — {entry.org}
            </span>
            <span className="text-xs text-fg-muted">
              {entry.start}–{entry.end}
            </span>
          </li>
        ))}
      </ol>
      <Link
        className="mt-6 inline-block font-mono text-sm text-phosphor underline underline-offset-4 transition-colors hover:text-fg"
        href="/cv"
      >
        full history: ./cv →
      </Link>
    </TerminalSection>
  );
}
