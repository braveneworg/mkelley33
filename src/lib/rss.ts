import type { Post } from '@/payload-types';

import { siteConfig } from '@/lib/site-config';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildRssXml(posts: Post[]): string {
  const items = posts
    .map((post) => {
      const url = `${siteConfig.url}/blog/${post.slug}`;
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid>${escapeXml(url)}</guid>`,
        `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
        post.excerpt
          ? `      <description>${escapeXml(post.excerpt)}</description>`
          : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(siteConfig.title)}</title>`,
    `    <link>${siteConfig.url}</link>`,
    `    <description>${escapeXml(siteConfig.description)}</description>`,
    `    <language>en</language>`,
    `    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('\n');
}
