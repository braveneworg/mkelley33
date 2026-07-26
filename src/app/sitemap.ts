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
    ...posts.map((post) => ({
      lastModified: post.updatedAt,
      url: `${siteConfig.url}/blog/${post.slug}`,
    })),
  ];
}
