/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useId } from 'react';

import { Turnstile } from '@marsidev/react-turnstile';

import { useGuardedForm } from '@/components/forms/use-guarded-form';
import { describedBy, ErrorText, FieldError, fieldMessage } from '@/components/ui/error-text';
import { submitComment } from '@/lib/actions/comments';
import type { CommentFormValues } from '@/lib/validation/comments';
import { commentSchema } from '@/lib/validation/comments';

export interface CommentFormProps {
  /** Present on reply forms; absent on the top-level form. */
  parentId?: string;
  postId: string;
}

const inputClasses =
  'border-edge bg-surface text-fg focus:border-phosphor w-full rounded border px-3 py-2 font-mono text-sm focus:outline-none';

/**
 * Spam-gated comment form. Several instances can be mounted at once (the
 * top-level form plus any open reply forms), so field ids come from
 * `useId`. The success copy promises moderation, not visibility — nothing
 * renders publicly until the owner approves it.
 */
export const CommentForm = ({ parentId, postId }: CommentFormProps) => {
  const idPrefix = useId();
  const { form, isPending, onSubmit, serverError, succeeded, turnstileProps } =
    useGuardedForm<CommentFormValues>({
      defaultValues: {
        authorEmail: '',
        authorName: '',
        body: '',
        parentId: parentId ?? '',
        postId,
        turnstileToken: '',
        website: '',
      },
      schema: commentSchema,
      submit: submitComment,
    });
  const errors = form.formState.errors;
  const fieldId = (name: string): string => `${idPrefix}-${name}`;

  if (succeeded) {
    return (
      <p className="text-phosphor font-mono text-sm" role="status">
        comment queued — appears once approved ✓
      </p>
    );
  }

  return (
    <form className="max-w-xl space-y-3" noValidate onSubmit={onSubmit}>
      <div>
        <label className="text-fg-muted font-mono text-xs" htmlFor={fieldId('name')}>
          name
        </label>
        <input
          aria-describedby={describedBy(Boolean(errors.authorName), fieldId('name-error'))}
          aria-invalid={Boolean(errors.authorName)}
          autoComplete="name"
          className={inputClasses}
          id={fieldId('name')}
          type="text"
          {...form.register('authorName')}
        />
        <FieldError id={fieldId('name-error')} message={fieldMessage(errors.authorName)} />
      </div>
      <div>
        <label className="text-fg-muted font-mono text-xs" htmlFor={fieldId('email')}>
          email (optional — never published)
        </label>
        <input
          aria-describedby={describedBy(Boolean(errors.authorEmail), fieldId('email-error'))}
          aria-invalid={Boolean(errors.authorEmail)}
          autoComplete="email"
          className={inputClasses}
          id={fieldId('email')}
          type="email"
          {...form.register('authorEmail')}
        />
        <FieldError id={fieldId('email-error')} message={fieldMessage(errors.authorEmail)} />
      </div>
      <div>
        <label className="text-fg-muted font-mono text-xs" htmlFor={fieldId('body')}>
          comment
        </label>
        <textarea
          aria-describedby={describedBy(Boolean(errors.body), fieldId('body-error'))}
          aria-invalid={Boolean(errors.body)}
          className={inputClasses}
          id={fieldId('body')}
          rows={4}
          {...form.register('body')}
        />
        <FieldError id={fieldId('body-error')} message={fieldMessage(errors.body)} />
      </div>
      <div className="hidden">
        <label htmlFor={fieldId('website')}>website</label>
        <input
          autoComplete="off"
          id={fieldId('website')}
          tabIndex={-1}
          type="text"
          {...form.register('website')}
        />
      </div>
      <Turnstile {...turnstileProps} />
      <FieldError id={fieldId('turnstile-error')} message={fieldMessage(errors.turnstileToken)} />
      <button
        aria-describedby={describedBy(Boolean(errors.turnstileToken), fieldId('turnstile-error'))}
        className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-4 py-2 font-mono text-sm transition-colors disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'posting…' : 'post comment'}
      </button>
      {serverError ? (
        <ErrorText role="alert" size="sm">
          {serverError}
        </ErrorText>
      ) : null}
    </form>
  );
};
