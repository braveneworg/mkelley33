import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical';

import { CodeBlock } from '@/collections/blocks/code-block';
import { computeReadTime } from '@/collections/hooks/compute-read-time';
import { revalidateAfterChange, revalidateAfterDelete } from '@/collections/hooks/revalidate-post';

import type { CollectionConfig } from 'payload';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: ({ req }) => (req.user ? true : { status: { equals: 'published' } }),
  },
  admin: { defaultColumns: ['title', 'status', 'publishedAt'], useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', index: true, required: true, unique: true },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'body',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          BlocksFeature({ blocks: [CodeBlock] }),
        ],
      }),
      required: true,
    },
    {
      name: 'readTime',
      type: 'number',
      admin: { description: 'Minutes — computed on save', readOnly: true },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      required: true,
    },
  ],
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
    beforeChange: [computeReadTime],
  },
};
