/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createHash, randomBytes } from 'node:crypto';

export interface GeneratedToken {
  hash: string;
  raw: string;
}

/** Hash stored in the DB; the raw token only ever travels in the email link. */
export const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

export const generateToken = (): GeneratedToken => {
  const raw = randomBytes(32).toString('hex');
  return { hash: hashToken(raw), raw };
};
