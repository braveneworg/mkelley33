import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.email('enter a valid email').max(254),
  turnstileToken: z.string().min(1, 'verification incomplete — give it a beat and retry'),
  website: z.literal(''),
});

export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
