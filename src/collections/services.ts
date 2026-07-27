/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionConfig } from 'payload';

export const Services: CollectionConfig = {
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'order'],
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', required: true, type: 'text' },
    { index: true, name: 'slug', required: true, type: 'text', unique: true },
    { name: 'pitch', required: true, type: 'textarea' },
    { hasMany: true, name: 'deliverables', required: true, type: 'text' },
    { name: 'credibility', required: true, type: 'text' },
    { name: 'order', required: true, type: 'number' },
  ],
  slug: 'services',
};
