import { siteConfig } from '@/lib/site-config';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: '/', disallow: ['/admin'], userAgent: '*' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
