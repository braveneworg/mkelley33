/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Suspense } from 'react';

import type { ContactServiceOption } from '@/components/contact/contact-form';
import { ContactForm } from '@/components/contact/contact-form';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';
import { listServices } from '@/lib/repositories/services';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  description: 'Request services, ask a question about a post, or just say hi.',
  title: 'contact',
};

export default async function ContactPage() {
  const services: ContactServiceOption[] = (await listServices()).map((service) => ({
    name: service.name,
    slug: service.slug,
  }));
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        cat ./contact.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        <span aria-hidden="true"># </span>contact
      </h1>
      <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
        Request services, ask a question, or just say hi — this lands straight in my inbox.
      </p>
      <div className="mt-10">
        <Suspense fallback={null}>
          <ContactForm services={services} />
        </Suspense>
      </div>
      <section className="border-edge mt-16 border-t pt-10">
        <p className="text-fg-muted font-mono text-sm">
          <span aria-hidden="true" className="text-phosphor">
            $
          </span>{' '}
          subscribe --newsletter
        </p>
        <div className="mt-5">
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
