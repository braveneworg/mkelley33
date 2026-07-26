import { getPayload } from 'payload';

import config from '@payload-config';

import { generateToken, hashToken } from '@/lib/newsletter-tokens';
import type { Subscriber } from '@/payload-types';

export interface UpsertPendingResult {
  alreadyActive: boolean;
  rawToken: null | string;
}

const client = async () => getPayload({ config });

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
      const raced =
        error instanceof Error && error.message.includes('E11000')
          ? await findByEmail(normalized)
          : null;
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
