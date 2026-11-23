/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { keepFixedPageAddress } from '@/collections/hooks/keep-fixed-page-address';
import {
  revalidatePageAfterChange,
  revalidatePageAfterDelete,
} from '@/collections/hooks/revalidate-page';
import { PAGE_BLOCKS } from '@/collections/page-blocks';
import { FIXED_PAGE_SLUGS, validatePageSlug } from '@/lib/pages/page-address';

import type { CollectionConfig } from 'payload';

/**
 * Pages — the documents the owner creates, edits and arranges, each shown
 * at its own address as an ordered list of Blocks (see `CONTEXT.md`).
 *
 * Drafts are on: the owner saves a draft, previews it, publishes it, and
 * every published version is kept. Visitors only ever get a published Page;
 * `published-page.ts` is how the site asks for one.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    // A Fixed Page cannot be deleted, by anyone (see `CONTEXT.md`).
    delete: ({ req }) => (req.user ? { slug: { not_in: [...FIXED_PAGE_SLUGS] } } : false),
    // A signed-in owner sees drafts; everyone else only what is published.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  admin: {
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    description:
      'Home, blog, contact and services are Fixed Pages: they cannot be moved or deleted, and unpublishing one does not take it off the site — visitors keep the last published version until you publish again.',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        description:
          'The heading at the top of the Page. A Page that starts with a Hero shows the Hero instead.',
      },
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description:
          'One name, shown as /name. Changing it moves the Page: the old address stops working and nothing redirects to the new one.',
        position: 'sidebar',
      },
      index: true,
      label: 'Address',
      required: true,
      unique: true,
      validate: validatePageSlug,
    },
    {
      name: 'command',
      type: 'text',
      admin: { description: 'Shown above the heading as "$ …". Leave empty for no command line.' },
      label: 'Command line',
    },
    {
      name: 'intro',
      type: 'textarea',
      admin: { description: 'A sentence or two under the heading.' },
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [...PAGE_BLOCKS],
      labels: { plural: 'Blocks', singular: 'Block' },
    },
    {
      name: 'meta',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: { description: 'Shown in the browser tab and in search results.' },
          label: 'Search title',
        },
        {
          name: 'description',
          type: 'textarea',
          admin: { description: 'The summary search engines and link previews show.' },
          label: 'Search description',
        },
      ],
      label: 'Search',
    },
  ],
  hooks: {
    afterChange: [revalidatePageAfterChange],
    afterDelete: [revalidatePageAfterDelete],
    beforeChange: [keepFixedPageAddress],
  },
  labels: { plural: 'Pages', singular: 'Page' },
  versions: { drafts: true },
};
