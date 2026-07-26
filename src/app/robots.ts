import type { MetadataRoute } from 'next';

import { siteConfig } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: '/', disallow: ['/admin'], userAgent: '*' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
