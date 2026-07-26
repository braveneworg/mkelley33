import Link from 'next/link';

import { TerminalSection } from '@/components/home/terminal-section';
import { SERVICES } from '@/lib/services-content';

export function ServicesBeat() {
  return (
    <TerminalSection command="ls ./services">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service) => (
          <li key={service.slug}>
            <Link
              className="block h-full rounded-lg border border-edge bg-surface p-4 transition-colors hover:border-phosphor"
              href={`/services#${service.slug}`}
            >
              <span className="font-mono text-sm text-phosphor">
                {service.slug}/
              </span>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {service.name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </TerminalSection>
  );
}
