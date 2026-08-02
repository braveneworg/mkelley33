/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import type { BaseSyntheticEvent, RefObject } from 'react';
import { useRef, useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { ActionResult } from '@/lib/actions/types';
import { turnstileSiteKey } from '@/lib/turnstile/site-key';

import type { TurnstileInstance } from '@marsidev/react-turnstile';
import type { DefaultValues, FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

/** The two fields the spam gate owns on every public form. */
export interface SpamGuardedValues {
  turnstileToken: string;
  website: string;
}

/** Spread straight onto `<Turnstile />`; the hook keeps the token in sync. */
export interface TurnstileFieldProps {
  onExpire: () => void;
  onSuccess: (token: string) => void;
  ref: RefObject<null | TurnstileInstance>;
  siteKey: string;
}

export interface GuardedFormOptions<TValues extends FieldValues & SpamGuardedValues> {
  defaultValues: DefaultValues<TValues>;
  /** Input and output coincide: these schemas validate, they do not transform. */
  schema: ZodType<TValues, TValues>;
  /** The Server Action this form submits to. */
  submit: (values: TValues) => Promise<ActionResult>;
}

export interface GuardedForm<TValues extends FieldValues & SpamGuardedValues> {
  /** The React Hook Form instance, for the fields the form owns itself. */
  form: UseFormReturn<TValues>;
  isPending: boolean;
  /** Already wrapped in `handleSubmit` — hand it to `<form onSubmit>`. */
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
  serverError: null | string;
  succeeded: boolean;
  turnstileProps: TurnstileFieldProps;
}

const TURNSTILE_TOKEN = 'turnstileToken';

/**
 * Drives a spam-gated form end to end: validation, the pending transition, the
 * server error, and — the part that is easy to forget — retiring the Turnstile
 * token after a rejected submission. A token is single-use, so a form that
 * leaves the spent one in state sends a token the server has already refused
 * and traps the user in a loop of the same error.
 *
 * `succeeded` latches: a form that has gone through swaps itself for its
 * confirmation rather than offering to submit again.
 */
export const useGuardedForm = <TValues extends FieldValues & SpamGuardedValues>({
  defaultValues,
  schema,
  submit,
}: GuardedFormOptions<TValues>): GuardedForm<TValues> => {
  const [succeeded, setSucceeded] = useState(false);
  const [serverError, setServerError] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();
  const turnstileRef = useRef<null | TurnstileInstance>(null);
  const form = useForm<TValues>({ defaultValues, resolver: zodResolver(schema) });

  /**
   * `TValues` is only ever a superset of {@link SpamGuardedValues}, so the
   * field exists and holds a string — but `Path<TValues>` stays unresolved
   * while the type is generic, which is what the assertions bridge. Confined
   * to this one helper so no call site repeats them.
   */
  const setTurnstileToken = (token: string, shouldValidate: boolean): void => {
    form.setValue(TURNSTILE_TOKEN as Path<TValues>, token as PathValue<TValues, Path<TValues>>, {
      shouldValidate,
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submit(values);
      if (result.success) {
        setSucceeded(true);
        return;
      }
      setServerError(result.error);
      turnstileRef.current?.reset();
      setTurnstileToken('', false);
    });
  });

  return {
    form,
    isPending,
    onSubmit,
    serverError,
    succeeded,
    turnstileProps: {
      onExpire: () => setTurnstileToken('', false),
      onSuccess: (token) => setTurnstileToken(token, true),
      ref: turnstileRef,
      siteKey: turnstileSiteKey(),
    },
  };
};
