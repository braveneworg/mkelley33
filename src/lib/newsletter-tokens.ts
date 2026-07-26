import { createHash, randomBytes } from 'node:crypto';

export interface GeneratedToken {
  hash: string;
  raw: string;
}

/** Hash stored in the DB; the raw token only ever travels in the email link. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateToken(): GeneratedToken {
  const raw = randomBytes(32).toString('hex');
  return { hash: hashToken(raw), raw };
}
