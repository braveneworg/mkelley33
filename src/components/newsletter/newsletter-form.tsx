'use client';

import type { TurnstileInstance } from '@marsidev/react-turnstile';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import type { NewsletterFormValues } from '@/lib/validation/newsletter';

import { subscribeNewsletter } from '@/lib/actions/newsletter';
import { turnstileSiteKey } from '@/lib/turnstile';
import { newsletterSchema } from '@/lib/validation/newsletter';

export function NewsletterForm() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const form = useForm<NewsletterFormValues>({
    defaultValues: { email: '', turnstileToken: '', website: '' },
    resolver: zodResolver(newsletterSchema),
  });
  const errors = form.formState.errors;

  function onSubmit(values: NewsletterFormValues) {
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
  }

  if (done) {
    return (
      <p className="font-mono text-sm text-phosphor" role="status">
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
      // eslint-disable-next-line react-hooks/refs
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="newsletter-email">
            email
          </label>
          <input
            aria-describedby={
              errors.email ? 'newsletter-email-error' : undefined
            }
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            className="w-full rounded border border-edge bg-surface px-3 py-2 font-mono text-sm text-fg focus:border-phosphor focus:outline-none"
            id="newsletter-email"
            placeholder="you@example.com"
            type="email"
            {...form.register('email')}
          />
        </div>
        <button
          aria-describedby={
            errors.turnstileToken ? 'newsletter-turnstile-error' : undefined
          }
          className="rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'sending…' : 'subscribe'}
        </button>
      </div>
      {errors.email ? (
        <p
          className="font-mono text-xs text-fg-muted"
          id="newsletter-email-error"
        >
          <span aria-hidden="true"># </span>
          {errors.email.message}
        </p>
      ) : null}
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
        onExpire={() =>
          form.setValue('turnstileToken', '', { shouldValidate: false })
        }
        onSuccess={(token) =>
          form.setValue('turnstileToken', token, { shouldValidate: true })
        }
        ref={turnstileRef}
        siteKey={turnstileSiteKey()}
      />
      {errors.turnstileToken ? (
        <p className="font-mono text-xs text-fg-muted" id="newsletter-turnstile-error">
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
    </form>
  );
}
