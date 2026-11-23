/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { listPublishedPages } from '@/lib/repositories/pages';
import { listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

import type { MetadataRoute } from 'next';

/**
 * Every published Page and every published Post. A Page the owner publishes
 * is listed without a code change, and one that is unpublished drops out.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts] = await Promise.all([listPublishedPages(), listPublishedPosts()]);
  return [
    ...pages.map(({ href, updatedAt }) => ({
      lastModified: updatedAt,
      // The home Page's address is '/', which the site's own address already ends in.
      url: href === '/' ? siteConfig.url : `${siteConfig.url}${href}`,
    })),
    ...posts.map((post) => ({
      lastModified: post.updatedAt,
      url: `${siteConfig.url}/blog/${post.slug}`,
    })),
  ];
}
