/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { getPayload, ValidationError } from 'payload';

import config from '@payload-config';

import { generateToken, hashToken } from '@/lib/newsletter-tokens';
import type { Subscriber } from '@/payload-types';

export interface UpsertPendingResult {
  alreadyActive: boolean;
  rawToken: null | string;
}

const client = async () => getPayload({ config });

/**
 * Detects a unique-email (duplicate key) collision raised by `create`, in
 * both shapes it can reach us: `@payloadcms/db-mongodb` converts the driver's
 * E11000 error into a Payload `ValidationError` on the failing field (its
 * `handleError`), while a raw driver error still carries `E11000` in its
 * message.
 */
export const isDuplicateEmailError = (error: unknown): boolean => {
  if (error instanceof ValidationError) {
    return error.data.errors.some((fieldError) => fieldError.path === 'email');
  }
  return error instanceof Error && error.message.includes('E11000');
};

/**
 * Loads the subscriber that won a create race. If the lookup itself fails,
 * throws an `AggregateError` carrying both the original create error and the
 * lookup failure, so a failed recovery still diagnoses the race.
 */
const findRaceWinner = async (email: string, createError: unknown): Promise<null | Subscriber> => {
  try {
    return await findByEmail(email);
  } catch (lookupError) {
    throw new AggregateError(
      [createError, lookupError],
      'duplicate-email race recovery failed: could not load the winning subscriber',
      { cause: lookupError }
    );
  }
};

const findByEmail = async (email: string): Promise<null | Subscriber> => {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  });
  return result.docs[0] ?? null;
};

const findByToken = async (rawToken: string): Promise<null | Subscriber> => {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { confirmToken: { equals: hashToken(rawToken) } },
  });
  return result.docs[0] ?? null;
};

/**
 * Creates or re-arms a pending subscriber and returns the raw token to email.
 * Active subscribers keep their existing token (used for unsubscribe links).
 */
export const upsertPendingSubscriber = async (email: string): Promise<UpsertPendingResult> => {
  const normalized = email.trim().toLowerCase();
  const payload = await client();
  const existing = await findByEmail(normalized);
  if (existing?.status === 'active') {
    return { alreadyActive: true, rawToken: null };
  }
  const token = generateToken();
  if (existing) {
    await payload.update({
      collection: 'subscribers',
      data: {
        confirmToken: token.hash,
        confirmedAt: null,
        status: 'pending',
        unsubscribedAt: null,
      },
      id: existing.id,
      overrideAccess: true,
    });
  } else {
    try {
      await payload.create({
        collection: 'subscribers',
        data: { confirmToken: token.hash, email: normalized, status: 'pending' },
        overrideAccess: true,
      });
    } catch (error) {
      // Unique-index race: another request created this email between our
      // find and create. Re-arm the existing doc instead of failing the user.
      const raced = isDuplicateEmailError(error) ? await findRaceWinner(normalized, error) : null;
      if (!raced) {
        throw error;
      }
      await payload.update({
        collection: 'subscribers',
        data: {
          confirmToken: token.hash,
          confirmedAt: null,
          status: 'pending',
          unsubscribedAt: null,
        },
        id: raced.id,
        overrideAccess: true,
      });
      return { alreadyActive: false, rawToken: token.raw };
    }
  }
  return { alreadyActive: false, rawToken: token.raw };
};

export const confirmSubscriber = async (rawToken: string): Promise<boolean> => {
  const subscriber = await findByToken(rawToken);
  if (!subscriber) {
    return false;
  }
  if (subscriber.status === 'active') {
    return true;
  }
  if (subscriber.status !== 'pending') {
    return false;
  }
  const payload = await client();
  await payload.update({
    collection: 'subscribers',
    data: { confirmedAt: new Date().toISOString(), status: 'active' },
    id: subscriber.id,
    overrideAccess: true,
  });
  return true;
};

export const unsubscribeSubscriber = async (rawToken: string): Promise<boolean> => {
  const subscriber = await findByToken(rawToken);
  if (!subscriber) {
    return false;
  }
  if (subscriber.status === 'unsubscribed') {
    return true;
  }
  const payload = await client();
  await payload.update({
    collection: 'subscribers',
    data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
    id: subscriber.id,
    overrideAccess: true,
  });
  return true;
};
