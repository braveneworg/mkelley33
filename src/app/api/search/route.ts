import { NextResponse } from 'next/server';

import { listPublishedPosts } from '@/lib/repositories/posts';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const posts = await listPublishedPosts();
  const results = posts
    .filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        (post.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    )
    .slice(0, 8)
    .map((post) => ({ slug: post.slug, title: post.title }));
  return NextResponse.json(
    { results },
    { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=600' } },
  );
}
