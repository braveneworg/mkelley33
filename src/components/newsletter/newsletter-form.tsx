'use client';

import { useRef, useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useForm } from 'react-hook-form';

import { ErrorText, FieldError, fieldMessage } from '@/components/ui/error-text';
import { subscribeNewsletter } from '@/lib/actions/newsletter';
import { turnstileSiteKey } from '@/lib/turnstile';
import type { NewsletterFormValues } from '@/lib/validation/newsletter';
import { newsletterSchema } from '@/lib/validation/newsletter';

import type { TurnstileInstance } from '@marsidev/react-turnstile';

export const NewsletterForm = () => {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const form = useForm<NewsletterFormValues>({
    defaultValues: { email: '', turnstileToken: '', website: '' },
    resolver: zodResolver(newsletterSchema),
  });
  const errors = form.formState.errors;

  const onSubmit = (values: NewsletterFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await subscribeNewsletter(values);
      if (result.success) {
        setDone(true);
      } else {
        setServerError(result.error ?? 'something broke — retry in a bit');
        turnstileRef.current?.reset();
        form.setValue('turnstileToken', '', { shouldValidate: false });
      }
    });
  };

  if (done) {
    return (
      <p className="text-phosphor font-mono text-sm" role="status">
        subscription pending — check your inbox to confirm ✓
      </p>
    );
  }

  return (
    <form
      className="max-w-md space-y-3"
      noValidate
      // turnstileRef.current is only read inside the async submit handler
      // (never during render); the compiler can't see through RHF's
      // handleSubmit to confirm that.

      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="newsletter-email">
            email
          </label>
          <input
            aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className="border-edge bg-surface text-fg focus:border-phosphor w-full rounded border px-3 py-2 font-mono text-sm focus:outline-none"
            id="newsletter-email"
            placeholder="you@example.com"
            type="email"
            {...form.register('email')}
          />
        </div>
        <button
          aria-describedby={errors.turnstileToken ? 'newsletter-turnstile-error' : undefined}
          className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-4 py-2 font-mono text-sm transition-colors disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'sending…' : 'subscribe'}
        </button>
      </div>
      <FieldError id="newsletter-email-error" message={fieldMessage(errors.email)} />
      <div className="hidden">
        <label htmlFor="newsletter-website">website</label>
        <input
          autoComplete="off"
          id="newsletter-website"
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
      <FieldError id="newsletter-turnstile-error" message={fieldMessage(errors.turnstileToken)} />
      {serverError ? (
        <ErrorText role="alert" size="sm">
          {serverError}
        </ErrorText>
      ) : null}
    </form>
  );
};
