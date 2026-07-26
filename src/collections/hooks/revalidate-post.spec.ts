import { beforeEach, describe, expect, it, vi } from 'vitest';

import { revalidateAfterChange, revalidateAfterDelete } from '@/collections/hooks/revalidate-post';

const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));

const paths = (): string[] => revalidatePath.mock.calls.map((call) => String(call[0]));

beforeEach(() => {
  revalidatePath.mockClear();
});

describe('revalidateAfterChange', () => {
  it('revalidates the blog index, the post, the feed, and the sitemap', async () => {
    const doc = { slug: 'hello-world' };

    const returned = await revalidateAfterChange({ doc } as never);

    expect(paths()).toEqual(['/blog', '/blog/hello-world', '/feed.xml', '/sitemap.xml']);
    expect(returned).toBe(doc);
  });

  it('also revalidates the old path when the slug changed', async () => {
    await revalidateAfterChange({
      doc: { slug: 'new-slug' },
      previousDoc: { slug: 'old-slug' },
    } as never);

    expect(paths()).toContain('/blog/old-slug');
    expect(paths()).toContain('/blog/new-slug');
  });

  it('does not revalidate a duplicate path when the slug is unchanged', async () => {
    await revalidateAfterChange({
      doc: { slug: 'same' },
      previousDoc: { slug: 'same' },
    } as never);

    expect(paths().filter((p) => p === '/blog/same')).toHaveLength(1);
  });
});

describe('revalidateAfterDelete', () => {
  it('revalidates the blog index, the post, the feed, and the sitemap', async () => {
    const doc = { slug: 'gone' };

    const returned = await revalidateAfterDelete({ doc } as never);

    expect(paths()).toEqual(['/blog', '/blog/gone', '/feed.xml', '/sitemap.xml']);
    expect(returned).toBe(doc);
  });
});
