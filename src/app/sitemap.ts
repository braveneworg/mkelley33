import type { MetadataRoute } from 'next';

import { listPublishedPosts } from '@/lib/repositories/posts';
import { siteConfig } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Awaited<ReturnType<typeof listPublishedPosts>> = [];
  try {
    posts = await listPublishedPosts();
  } catch {
    // DB unavailable at build — ship the static entries.
  }
  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/blog` },
    { url: `${siteConfig.url}/services` },
    { url: `${siteConfig.url}/cv` },
    { url: `${siteConfig.url}/uses` },
    ...posts.map((post) => ({
      lastModified: post.updatedAt,
      url: `${siteConfig.url}/blog/${post.slug}`,
    })),
  ];
}
