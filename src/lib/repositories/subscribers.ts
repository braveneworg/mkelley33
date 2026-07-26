import config from '@payload-config';
import { getPayload } from 'payload';

import type { Subscriber } from '@/payload-types';

import { generateToken, hashToken } from '@/lib/newsletter-tokens';

export interface UpsertPendingResult {
  alreadyActive: boolean;
  rawToken: null | string;
}

async function client() {
  return getPayload({ config });
}

async function findByEmail(email: string): Promise<null | Subscriber> {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  });
  return result.docs[0] ?? null;
}

async function findByToken(rawToken: string): Promise<null | Subscriber> {
  const payload = await client();
  const result = await payload.find({
    collection: 'subscribers',
    limit: 1,
    overrideAccess: true,
    where: { confirmToken: { equals: hashToken(rawToken) } },
  });
  return result.docs[0] ?? null;
}

/**
 * Creates or re-arms a pending subscriber and returns the raw token to email.
 * Active subscribers keep their existing token (used for unsubscribe links).
 */
export async function upsertPendingSubscriber(
  email: string,
): Promise<UpsertPendingResult> {
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
        status: 'pending',
        unsubscribedAt: null,
      },
      id: existing.id,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'subscribers',
      data: { confirmToken: token.hash, email: normalized, status: 'pending' },
      overrideAccess: true,
    });
  }
  return { alreadyActive: false, rawToken: token.raw };
}

export async function confirmSubscriber(rawToken: string): Promise<boolean> {
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
}

export async function unsubscribeSubscriber(
  rawToken: string,
): Promise<boolean> {
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
}
