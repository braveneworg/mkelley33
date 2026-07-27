/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionConfig } from 'payload';

export const Subscribers: CollectionConfig = {
  access: {
    create: () => false,
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['email', 'status', 'confirmedAt'],
    useAsTitle: 'email',
  },
  fields: [
    { index: true, name: 'email', required: true, type: 'email', unique: true },
    {
      defaultValue: 'pending',
      name: 'status',
      options: [
        { label: 'pending', value: 'pending' },
        { label: 'active', value: 'active' },
        { label: 'unsubscribed', value: 'unsubscribed' },
      ],
      required: true,
      type: 'select',
    },
    { admin: { hidden: true }, index: true, name: 'confirmToken', type: 'text' },
    { admin: { readOnly: true }, name: 'confirmedAt', type: 'date' },
    { admin: { readOnly: true }, name: 'unsubscribedAt', type: 'date' },
  ],
  slug: 'subscribers',
};
