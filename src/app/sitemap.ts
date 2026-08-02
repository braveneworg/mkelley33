/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedPosts();
  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/blog` },
    { url: `${siteConfig.url}/services` },
    { url: `${siteConfig.url}/cv` },
    { url: `${siteConfig.url}/uses` },
    { url: `${siteConfig.url}/contact` },
    { url: `${siteConfig.url}/privacy` },
    ...posts.map((post) => ({
      lastModified: post.updatedAt,
      url: `${siteConfig.url}/blog/${post.slug}`,
    })),
  ];
}
