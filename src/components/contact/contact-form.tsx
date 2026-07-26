'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import type { ContactFormValues, ContactReason } from '@/lib/validation/contact';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { submitContact } from '@/lib/actions/contact';
import { turnstileSiteKey } from '@/lib/turnstile';
import {
  CONTACT_REASON_LABELS,
  CONTACT_REASONS,
  contactSchema,
} from '@/lib/validation/contact';

export interface ContactServiceOption {
  name: string;
  slug: string;
}

const INPUT_CLASSES =
  'w-full rounded border border-edge bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-phosphor focus:outline-none';

function isContactReason(value: null | string): value is ContactReason {
  return CONTACT_REASONS.includes(value as ContactReason);
}

export function ContactForm({
  services,
}: {
  services: ContactServiceOption[];
}) {
  const searchParams = useSearchParams();
  const validSlugs = new Set(services.map((service) => service.slug));
  const reasonParam = searchParams.get('reason');
  const initialServices = searchParams
    .getAll('service')
    .filter((slug) => validSlugs.has(slug));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ContactFormValues>({
    defaultValues: {
      email: '',
      message: '',
      name: '',
      reason: isContactReason(reasonParam) ? reasonParam : 'general',
      requestedServices: initialServices,
      turnstileToken: '',
      website: '',
    },
    resolver: zodResolver(contactSchema),
  });
  const reason = form.watch('reason');
  const selectedSlugs = form.watch('requestedServices');
  const errors = form.formState.errors;

  function toggleService(slug: string) {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((current) => current !== slug)
      : [...selectedSlugs, slug];
    form.setValue('requestedServices', next, { shouldValidate: true });
  }

  function onSubmit(values: ContactFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await submitContact(values);
      if (result.success) {
        setSubmitted(true);
      } else {
        setServerError(result.error ?? 'something broke — retry in a bit');
      }
    });
  }

  if (submitted) {
    return (
      <div role="status">
        <p className="font-mono text-sm text-fg-muted">
          <span className="text-phosphor">$</span> ./send-message
        </p>
        <p className="mt-2 font-mono text-lg text-phosphor">
          message queued ✓
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          I read everything and reply within a couple of days.
        </p>
      </div>
    );
  }

  return (
    <form
      className="max-w-xl space-y-5"
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-name">
          name
        </label>
        <input
          aria-describedby={errors.name ? 'contact-name-error' : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-name"
          type="text"
          {...form.register('name')}
        />
        {errors.name ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-name-error"
          >
            <span aria-hidden="true"># </span>
            {errors.name.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-email">
          email
        </label>
        <input
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-email"
          type="email"
          {...form.register('email')}
        />
        {errors.email ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-email-error"
          >
            <span aria-hidden="true"># </span>
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-reason">
          reason
        </label>
        <select
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-reason"
          {...form.register('reason')}
        >
          {CONTACT_REASONS.map((value) => (
            <option key={value} value={value}>
              {CONTACT_REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      {reason === 'services' ? (
        <div>
          <Dialog>
            <DialogTrigger className="rounded border border-edge px-3 py-2 font-mono text-sm text-fg transition-colors hover:border-phosphor">
              select services…
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>select services</DialogTitle>
              <ul className="mt-4 space-y-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <label className="flex items-center gap-3 font-mono text-sm text-fg">
                      <input
                        checked={selectedSlugs.includes(service.slug)}
                        className="size-4 accent-(--accent)"
                        onChange={() => toggleService(service.slug)}
                        type="checkbox"
                      />
                      {service.name}
                    </label>
                  </li>
                ))}
              </ul>
              <DialogClose className="mt-6 rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas">
                done
              </DialogClose>
            </DialogContent>
          </Dialog>
          {selectedSlugs.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {services
                .filter((service) => selectedSlugs.includes(service.slug))
                .map((service) => (
                  <li
                    className="flex items-center gap-2 rounded border border-edge bg-surface px-2 py-1 font-mono text-xs text-fg"
                    key={service.slug}
                  >
                    {service.name}
                    <button
                      aria-label={`remove ${service.name}`}
                      className="text-fg-muted transition-colors hover:text-phosphor"
                      onClick={() => toggleService(service.slug)}
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
          {errors.requestedServices ? (
            <p className="mt-1 font-mono text-xs text-fg-muted">
              <span aria-hidden="true"># </span>
              {errors.requestedServices.message}
            </p>
          ) : null}
        </div>
      ) : null}
      <div>
        <label className="font-mono text-sm text-fg" htmlFor="contact-message">
          message
        </label>
        <textarea
          aria-describedby={
            errors.message ? 'contact-message-error' : undefined
          }
          aria-invalid={Boolean(errors.message)}
          className={`mt-1 min-h-32 ${INPUT_CLASSES}`}
          id="contact-message"
          {...form.register('message')}
        />
        {errors.message ? (
          <p
            className="mt-1 font-mono text-xs text-fg-muted"
            id="contact-message-error"
          >
            <span aria-hidden="true"># </span>
            {errors.message.message}
          </p>
        ) : null}
      </div>
      <div className="hidden">
        <label htmlFor="contact-website">website</label>
        <input
          autoComplete="off"
          id="contact-website"
          tabIndex={-1}
          type="text"
          {...form.register('website')}
        />
      </div>
      <Turnstile
        onSuccess={(token) =>
          form.setValue('turnstileToken', token, { shouldValidate: true })
        }
        siteKey={turnstileSiteKey()}
      />
      {errors.turnstileToken ? (
        <p className="font-mono text-xs text-fg-muted">
          <span aria-hidden="true"># </span>
          {errors.turnstileToken.message}
        </p>
      ) : null}
      {serverError ? (
        <p className="font-mono text-sm text-fg-muted" role="alert">
          <span aria-hidden="true"># </span>
          {serverError}
        </p>
      ) : null}
      <button
        className="rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'sending…' : '$ ./send-message'}
      </button>
    </form>
  );
}
