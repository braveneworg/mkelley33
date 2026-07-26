'use client';

import { useRef, useState, useTransition } from 'react';

import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useForm } from 'react-hook-form';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { describedBy, ErrorText, FieldError, fieldMessage } from '@/components/ui/error-text';
import { submitContact } from '@/lib/actions/contact';
import { turnstileSiteKey } from '@/lib/turnstile';
import type { ContactFormValues, ContactReason } from '@/lib/validation/contact';
import { CONTACT_REASON_LABELS, CONTACT_REASONS, contactSchema } from '@/lib/validation/contact';

import type { TurnstileInstance } from '@marsidev/react-turnstile';

export interface ContactServiceOption {
  name: string;
  slug: string;
}

const INPUT_CLASSES =
  'w-full rounded border border-edge bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-phosphor focus:outline-none';

const isContactReason = (value: null | string): value is ContactReason =>
  CONTACT_REASONS.includes(value as ContactReason);

export const ContactForm = ({ services }: { services: ContactServiceOption[] }) => {
  const searchParams = useSearchParams();
  const validSlugs = new Set(services.map((service) => service.slug));
  const reasonParam = searchParams.get('reason');
  const initialServices = searchParams.getAll('service').filter((slug) => validSlugs.has(slug));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
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

  const toggleService = (slug: string) => {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter((current) => current !== slug)
      : [...selectedSlugs, slug];
    form.setValue('requestedServices', next, { shouldValidate: true });
  };

  const onSubmit = (values: ContactFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitContact(values);
      if (result.success) {
        setSubmitted(true);
      } else {
        setServerError(result.error ?? 'something broke — retry in a bit');
        turnstileRef.current?.reset();
        form.setValue('turnstileToken', '', { shouldValidate: false });
      }
    });
  };

  if (submitted) {
    return (
      <div role="status">
        <p className="text-fg-muted font-mono text-sm">
          <span className="text-phosphor">$</span> ./send-message
        </p>
        <p className="text-phosphor mt-2 font-mono text-lg">message queued ✓</p>
        <p className="text-fg-muted mt-2 text-sm">
          I read everything and reply within a couple of days.
        </p>
      </div>
    );
  }

  return (
    <form className="max-w-xl space-y-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="text-fg font-mono text-sm" htmlFor="contact-name">
          name
        </label>
        <input
          aria-describedby={describedBy(Boolean(errors.name), 'contact-name-error')}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-name"
          type="text"
          {...form.register('name')}
        />
        <FieldError className="mt-1" id="contact-name-error" message={fieldMessage(errors.name)} />
      </div>
      <div>
        <label className="text-fg font-mono text-sm" htmlFor="contact-email">
          email
        </label>
        <input
          aria-describedby={describedBy(Boolean(errors.email), 'contact-email-error')}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className={`mt-1 ${INPUT_CLASSES}`}
          id="contact-email"
          type="email"
          {...form.register('email')}
        />
        <FieldError
          className="mt-1"
          id="contact-email-error"
          message={fieldMessage(errors.email)}
        />
      </div>
      <div>
        <label className="text-fg font-mono text-sm" htmlFor="contact-reason">
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
            <DialogTrigger
              aria-describedby={describedBy(
                Boolean(errors.requestedServices),
                'contact-services-error'
              )}
              className="border-edge text-fg hover:border-phosphor rounded border px-3 py-2 font-mono text-sm transition-colors"
            >
              select services…
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>select services</DialogTitle>
              <ul className="mt-4 space-y-3">
                {services.map((service) => (
                  <li key={service.slug}>
                    <label className="text-fg flex items-center gap-3 font-mono text-sm">
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
              <DialogClose className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas mt-6 rounded border px-4 py-2 font-mono text-sm transition-colors">
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
                    className="border-edge bg-surface text-fg flex items-center gap-2 rounded border px-2 py-1 font-mono text-xs"
                    key={service.slug}
                  >
                    {service.name}
                    <button
                      aria-label={`remove ${service.name}`}
                      className="text-fg-muted hover:text-phosphor transition-colors"
                      onClick={() => toggleService(service.slug)}
                      type="button"
                    >
                      ×
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
          <FieldError
            className="mt-1"
            id="contact-services-error"
            message={fieldMessage(errors.requestedServices)}
          />
        </div>
      ) : null}
      <div>
        <label className="text-fg font-mono text-sm" htmlFor="contact-message">
          message
        </label>
        <textarea
          aria-describedby={describedBy(Boolean(errors.message), 'contact-message-error')}
          aria-invalid={Boolean(errors.message)}
          className={`mt-1 min-h-32 ${INPUT_CLASSES}`}
          id="contact-message"
          {...form.register('message')}
        />
        <FieldError
          className="mt-1"
          id="contact-message-error"
          message={fieldMessage(errors.message)}
        />
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
        onExpire={() => form.setValue('turnstileToken', '', { shouldValidate: false })}
        onSuccess={(token) => form.setValue('turnstileToken', token, { shouldValidate: true })}
        ref={turnstileRef}
        siteKey={turnstileSiteKey()}
      />
      <FieldError id="contact-turnstile-error" message={fieldMessage(errors.turnstileToken)} />
      {serverError ? (
        <ErrorText role="alert" size="sm">
          {serverError}
        </ErrorText>
      ) : null}
      <button
        aria-describedby={describedBy(Boolean(errors.turnstileToken), 'contact-turnstile-error')}
        className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-4 py-2 font-mono text-sm transition-colors disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'sending…' : '$ ./send-message'}
      </button>
    </form>
  );
};
