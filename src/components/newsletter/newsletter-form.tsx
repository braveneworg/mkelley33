/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { Turnstile } from '@marsidev/react-turnstile';

import { useGuardedForm } from '@/components/forms/use-guarded-form';
import { describedBy, ErrorText, FieldError, fieldMessage } from '@/components/ui/error-text';
import { subscribeNewsletter } from '@/lib/actions/newsletter';
import type { NewsletterFormValues } from '@/lib/validation/newsletter';
import { newsletterSchema } from '@/lib/validation/newsletter';

export const NewsletterForm = () => {
  const { form, isPending, onSubmit, serverError, succeeded, turnstileProps } =
    useGuardedForm<NewsletterFormValues>({
      defaultValues: { email: '', turnstileToken: '', website: '' },
      schema: newsletterSchema,
      submit: subscribeNewsletter,
    });
  const errors = form.formState.errors;

  if (succeeded) {
    return (
      <p className="text-phosphor font-mono text-sm" role="status">
        subscription pending — check your inbox to confirm ✓
      </p>
    );
  }

  return (
    <form className="max-w-md space-y-3" noValidate onSubmit={onSubmit}>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="sr-only" htmlFor="newsletter-email">
            email
          </label>
          <input
            aria-describedby={describedBy(Boolean(errors.email), 'newsletter-email-error')}
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
          aria-describedby={describedBy(
            Boolean(errors.turnstileToken),
            'newsletter-turnstile-error'
          )}
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
      <Turnstile {...turnstileProps} />
      <FieldError id="newsletter-turnstile-error" message={fieldMessage(errors.turnstileToken)} />
      {serverError ? (
        <ErrorText role="alert" size="sm">
          {serverError}
        </ErrorText>
      ) : null}
    </form>
  );
};
