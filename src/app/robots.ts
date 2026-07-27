/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { siteConfig } from '@/lib/site-config';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ allow: '/', disallow: ['/admin'], userAgent: '*' }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
