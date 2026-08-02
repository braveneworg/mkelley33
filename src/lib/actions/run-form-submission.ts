/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ActionResult } from '@/lib/actions/types';
import { verifyTurnstileToken } from '@/lib/turnstile/verify';

import type { ZodType } from 'zod';

/**
 * One message for every submission that fails the spam gate, on every form.
 * The two actions used to spell it out separately, which is how such strings
 * drift apart.
 */
export const TURNSTILE_FAILED_ERROR = 'verification failed — give it a beat and retry';

/** Every public form is spam-gated, so every value set carries a token. */
interface SpamGuardedValues {
  turnstileToken: string;
}

export interface FormSubmission<TValues extends SpamGuardedValues, TPersisted> {
  /** Shown when the work after verification throws. */
  failureError: string;
  /** Unvalidated Server Action argument, straight off the wire. */
  input: unknown;
  /** Shown when `schema` rejects the input. */
  invalidInputError: string;
  /** Action name, used to attribute server-side logs. */
  label: string;
  /** Told about the accepted submission; its failure never fails the action. */
  notify: (values: TValues, persisted: TPersisted) => Promise<void>;
  /** The write that must succeed for the submission to count. */
  persist: (values: TValues) => Promise<TPersisted>;
  schema: ZodType<TValues>;
}

/**
 * A hidden field real users never see and bots reliably fill. Checked against
 * the raw input, before parsing, because the schemas require it to be empty —
 * parsing first would turn a silent accept into a visible validation error and
 * tell the bot exactly what it tripped.
 */
const honeypotFilled = (input: unknown): boolean =>
  typeof input === 'object' &&
  input !== null &&
  'website' in input &&
  Boolean((input as { website?: unknown }).website);

/**
 * The submission is already stored by the time this runs, so a failed
 * notification is the site's problem and not the user's: telling them it broke
 * would invite a resubmission that duplicates data we already hold.
 */
const notifyQuietly = async (label: string, send: () => Promise<void>): Promise<void> => {
  try {
    await send();
  } catch (error) {
    console.error(`${label} notification failed:`, error);
  }
};

/**
 * Runs the spam-gated submission pipeline shared by every public form:
 * honeypot, schema, Turnstile, persist, notify. The order is the point —
 * each stage is a gate the next one depends on — and it lives here so no
 * action can quietly get it wrong.
 *
 * Never throws and never leaks an internal error to the caller: every exit is
 * an {@link ActionResult} carrying a message written for a human.
 */
export const runFormSubmission = async <TValues extends SpamGuardedValues, TPersisted>({
  failureError,
  input,
  invalidInputError,
  label,
  notify,
  persist,
  schema,
}: FormSubmission<TValues, TPersisted>): Promise<ActionResult> => {
  if (honeypotFilled(input)) {
    return { success: true };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: invalidInputError, success: false };
  }
  const values = parsed.data;
  if (!(await verifyTurnstileToken(values.turnstileToken))) {
    return { error: TURNSTILE_FAILED_ERROR, success: false };
  }
  try {
    const persisted = await persist(values);
    await notifyQuietly(label, () => notify(values, persisted));
    return { success: true };
  } catch (error) {
    console.error(`${label} failed:`, error);
    return { error: failureError, success: false };
  }
};
