import type { ServiceContent } from '@/lib/services-content';

import { ButtonLink } from '@/components/ui/button-link';

export function ServiceSection({ service }: { service: ServiceContent }) {
  return (
    <section
      className="scroll-mt-24 border-t border-edge py-10 first:border-t-0"
      id={service.slug}
    >
      <h2 className="font-mono text-xl font-bold text-phosphor">
        {service.slug}/
      </h2>
      <p className="mt-1 font-mono text-sm text-fg">{service.name}</p>
      <p className="mt-4 max-w-2xl leading-relaxed text-fg-muted">
        {service.pitch}
      </p>
      <ul className="mt-4 max-w-2xl space-y-1 text-sm text-fg">
        {service.deliverables.map((deliverable) => (
          <li className="flex gap-2" key={deliverable}>
            <span aria-hidden="true" className="text-phosphor">
              ▸
            </span>
            <span>{deliverable}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-2xl font-mono text-xs text-fg-muted">
        <span aria-hidden="true">#</span> {service.credibility}
      </p>
      <ButtonLink
        className="mt-5"
        href={`/contact?reason=services&service=${service.slug}`}
      >
        Request a quote →
      </ButtonLink>
    </section>
  );
}
