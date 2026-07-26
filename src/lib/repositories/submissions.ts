import config from '@payload-config';
import { getPayload } from 'payload';

import type { ContactReason } from '@/lib/validation/contact';
import type { ContactSubmission } from '@/payload-types';

export interface CreateSubmissionInput {
  email: string;
  message: string;
  name: string;
  reason: ContactReason;
  requestedServiceIds: string[];
}

/** Mutation — the Server Action is the gatekeeper, so access is overridden. */
export async function createSubmission(
  input: CreateSubmissionInput,
): Promise<ContactSubmission> {
  const payload = await getPayload({ config });
  return payload.create({
    collection: 'contact-submissions',
    data: {
      email: input.email,
      message: input.message,
      name: input.name,
      reason: input.reason,
      requestedServices: input.requestedServiceIds,
      status: 'new',
    },
    overrideAccess: true,
  });
}
