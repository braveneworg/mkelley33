import { ServiceSection } from '@/components/services/service-section';
import { listServices } from '@/lib/repositories/services';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'AI engineering enablement, full-stack product development, accessibility, performance, and mentoring — request a quote.',
  title: 'services',
};

export default async function ServicesPage() {
  const services = await listServices();
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        ls ./services
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        <span aria-hidden="true"># </span>services
      </h1>
      <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
        Five ways I can help your team ship. Every engagement starts with a conversation — request a
        quote and tell me where it hurts.
      </p>
      <div className="mt-10">
        {services.map((service) => (
          <ServiceSection key={service.slug} service={service} />
        ))}
      </div>
    </div>
  );
}
