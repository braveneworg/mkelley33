import { newsletterSchema } from '@/lib/validation/newsletter';

describe('newsletterSchema', () => {
  it('accepts a valid signup and rejects a bad email', () => {
    const valid = { email: 'a@b.com', turnstileToken: 'tok', website: '' };
    expect(newsletterSchema.safeParse(valid).success).toBe(true);
    expect(newsletterSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });
});
