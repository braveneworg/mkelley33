/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { listPublishedPosts } from '@/lib/repositories/posts';
import { buildRssXml } from '@/lib/rss';

export const revalidate = 300;

export async function GET(): Promise<Response> {
  const posts = await listPublishedPosts();
  return new Response(buildRssXml(posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
