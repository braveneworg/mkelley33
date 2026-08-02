/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  revalidateCommentAfterChange,
  revalidateCommentAfterDelete,
} from '@/collections/hooks/revalidate-comment';
import { validateCommentTarget } from '@/collections/hooks/validate-comment';

import type { CollectionConfig } from 'payload';

/**
 * Reader comments on blog posts. Anonymous visitors submit through the
 * comment Server Action alone (`create: () => false`, same posture as
 * contact-submissions/subscribers); everything lands `pending` and only
 * `approved` documents are readable without a session. `status` is the one
 * field moderation edits — commenter fields stay read-only in the admin.
 *
 * `authorEmail` is collected for moderation follow-up only. Its field-level
 * read access is the sole guard keeping it out of the public REST/GraphQL
 * mounts and user-less local-API reads — never weaken it.
 */
export const Comments: CollectionConfig = {
  access: {
    create: () => false,
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => (req.user ? true : { status: { equals: 'approved' } }),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    defaultColumns: ['authorName', 'status', 'post', 'createdAt'],
    useAsTitle: 'authorName',
  },
  fields: [
    { admin: { readOnly: true }, name: 'authorName', required: true, type: 'text' },
    {
      access: { read: ({ req }) => Boolean(req.user) },
      admin: { description: 'Never published — moderation contact only', readOnly: true },
      name: 'authorEmail',
      type: 'email',
    },
    { admin: { readOnly: true }, name: 'body', required: true, type: 'textarea' },
    {
      admin: { readOnly: true },
      index: true,
      name: 'post',
      relationTo: 'posts',
      required: true,
      type: 'relationship',
    },
    {
      admin: { readOnly: true },
      index: true,
      name: 'parent',
      relationTo: 'comments',
      type: 'relationship',
    },
    {
      defaultValue: 'pending',
      index: true,
      name: 'status',
      options: [
        { label: 'pending', value: 'pending' },
        { label: 'approved', value: 'approved' },
        { label: 'spam', value: 'spam' },
      ],
      required: true,
      type: 'select',
    },
  ],
  hooks: {
    afterChange: [revalidateCommentAfterChange],
    afterDelete: [revalidateCommentAfterDelete],
    beforeValidate: [validateCommentTarget],
  },
  slug: 'comments',
};
