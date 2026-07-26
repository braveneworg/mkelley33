import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { SERVICES } from '@/lib/services-content';

export const ServicesBeat = () => (
  <TerminalSection command="ls ./services">
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map((service) => (
        <li key={service.slug}>
          <Link
            className="border-edge bg-surface hover:border-phosphor block h-full rounded-lg border p-4 transition-colors"
            href={`/services#${service.slug}`}
          >
            <span className="text-phosphor font-mono text-sm">{service.slug}/</span>
            <p className="text-fg-muted mt-2 text-sm leading-relaxed">{service.name}</p>
          </Link>
        </li>
      ))}
    </ul>
  </TerminalSection>
);
