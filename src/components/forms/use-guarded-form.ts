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

import type { TurnstileInstance, TurnstileProps } from '@marsidev/react-turnstile';
import type { DefaultValues, FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

/** The two fields the spam gate owns on every public form. */
export interface SpamGuardedValues {
  turnstileToken: string;
  website: string;
}

/** The render options every spam-gated widget shares. */
export type TurnstileWidgetOptions = Pick<
  NonNullable<TurnstileProps['options']>,
  'appearance' | 'execution'
>;

/** Spread straight onto `<Turnstile />`; the hook keeps the token in sync. */
export interface TurnstileFieldProps {
  onExpire: () => void;
  onSuccess: (token: string) => void;
  onWidgetLoad: () => void;
  options: TurnstileWidgetOptions;
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
  /**
   * Hand it to `<form onFocus>`. React's `onFocus` fires for any focused
   * descendant, so the first field, button, or dialog trigger the visitor
   * reaches starts the challenge.
   */
  onFocus: () => void;
  /** Already wrapped in `handleSubmit` — hand it to `<form onSubmit>`. */
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
  serverError: null | string;
  succeeded: boolean;
  turnstileProps: TurnstileFieldProps;
}

const TURNSTILE_TOKEN = 'turnstileToken';

/**
 * The widget renders on page load but runs its challenge only when told to
 * (`execute`), and shows nothing unless Cloudflare needs the visitor to do
 * something (`interaction-only`). Rendering eagerly meant every page view
 * issued a challenge — crawlers included — while only a submission ever
 * verified one, and a five-minute token spent itself while the visitor was
 * still reading. Invisible behaviour is what obliges `/privacy` to cite
 * Cloudflare's Turnstile Privacy Addendum.
 */
const TURNSTILE_OPTIONS: TurnstileWidgetOptions = {
  appearance: 'interaction-only',
  execution: 'execute',
};

/**
 * Drives a spam-gated form end to end: validation, the pending transition, the
 * server error, and — the part that is easy to forget — retiring the Turnstile
 * token after a rejected submission. A token is single-use, so a form that
 * leaves the spent one in state sends a token the server has already refused
 * and traps the user in a loop of the same error.
 *
 * The challenge starts on the visitor's first interaction with the form, once
 * the widget has loaded — whichever comes second. react-turnstile's
 * `execute()` is a silent no-op before the widget renders, so a visitor who
 * outpaces Cloudflare's script must not be forgotten.
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
  const challengeWanted = useRef(false);
  const widgetReady = useRef(false);
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

  /** Runs the challenge only once both the visitor and the widget are ready. */
  const runChallenge = (): void => {
    if (challengeWanted.current && widgetReady.current) {
      turnstileRef.current?.execute();
    }
  };

  const onFocus = (): void => {
    if (challengeWanted.current) {
      return;
    }
    challengeWanted.current = true;
    runChallenge();
  };

  const onWidgetLoad = (): void => {
    widgetReady.current = true;
    runChallenge();
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
      // In execute mode a reset widget sits idle until told to run again.
      turnstileRef.current?.reset();
      runChallenge();
      setTurnstileToken('', false);
    });
  });

  return {
    form,
    isPending,
    onFocus,
    onSubmit,
    serverError,
    succeeded,
    turnstileProps: {
      onExpire: () => setTurnstileToken('', false),
      onSuccess: (token) => setTurnstileToken(token, true),
      onWidgetLoad,
      options: TURNSTILE_OPTIONS,
      ref: turnstileRef,
      siteKey: turnstileSiteKey(),
    },
  };
};
