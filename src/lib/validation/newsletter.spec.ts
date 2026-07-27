/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { newsletterSchema } from '@/lib/validation/newsletter';

describe('newsletterSchema', () => {
  it('accepts a valid signup and rejects a bad email', () => {
    const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };
    expect(newsletterSchema.safeParse(valid).success).toBe(true);
    expect(newsletterSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });
});
