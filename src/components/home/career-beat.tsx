import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { CV_EXPERIENCE } from '@/lib/cv-content';

export const CareerBeat = () => (
  <TerminalSection command="git log --career">
    <ol className="space-y-3">
      {CV_EXPERIENCE.map((entry) => (
        <li className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm" key={entry.hash}>
          <span className="text-phosphor">{entry.hash}</span>
          <span className="text-fg">
            {entry.role} — {entry.org}
          </span>
          <span className="text-fg-muted text-xs">
            {entry.start}–{entry.end}
          </span>
        </li>
      ))}
    </ol>
    <Link
      className="text-phosphor hover:text-fg mt-6 inline-block font-mono text-sm underline underline-offset-4 transition-colors"
      href="/cv"
    >
      full history: ./cv →
    </Link>
  </TerminalSection>
);
