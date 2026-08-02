/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import path from 'path';
import { fileURLToPath } from 'url';

import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Comments } from '@/collections/comments';
import { ContactSubmissions } from '@/collections/contact-submissions';
import { Media } from '@/collections/media';
import { Posts } from '@/collections/posts';
import { Services } from '@/collections/services';
import { Subscribers } from '@/collections/subscribers';
import { Users } from '@/collections/users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: { user: 'users' },
  collections: [Users, Media, Posts, Services, ContactSubmissions, Subscribers, Comments],
  db: mongooseAdapter({ url: process.env.DATABASE_URL ?? '' }),
  editor: lexicalEditor(),
  plugins: [
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
  secret: process.env.PAYLOAD_SECRET ?? '',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
});
