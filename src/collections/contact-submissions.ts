import { CONTACT_REASON_LABELS, CONTACT_REASONS } from '@/lib/validation/contact';

import type { CollectionConfig } from 'payload';

export const ContactSubmissions: CollectionConfig = {
  access: {
    create: () => false,
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['name', 'email', 'reason', 'status', 'createdAt'],
    useAsTitle: 'name',
  },
  fields: [
    { admin: { readOnly: true }, name: 'name', required: true, type: 'text' },
    { admin: { readOnly: true }, name: 'email', required: true, type: 'email' },
    {
      admin: { readOnly: true },
      name: 'reason',
      options: CONTACT_REASONS.map((reason) => ({
        label: CONTACT_REASON_LABELS[reason],
        value: reason,
      })),
      required: true,
      type: 'select',
    },
    {
      admin: { readOnly: true },
      hasMany: true,
      name: 'requestedServices',
      relationTo: 'services',
      type: 'relationship',
    },
    {
      admin: { readOnly: true },
      name: 'message',
      required: true,
      type: 'textarea',
    },
    {
      defaultValue: 'new',
      name: 'status',
      options: [
        { label: 'new', value: 'new' },
        { label: 'replied', value: 'replied' },
        { label: 'archived', value: 'archived' },
      ],
      required: true,
      type: 'select',
    },
  ],
  slug: 'contact-submissions',
};
