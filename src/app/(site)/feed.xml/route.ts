import { listPublishedPosts } from '@/lib/repositories/posts';
import { buildRssXml } from '@/lib/rss';

export const revalidate = 300;

export async function GET(): Promise<Response> {
  const posts = await listPublishedPosts();
  return new Response(buildRssXml(posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
