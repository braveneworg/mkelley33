import { describe, expect, it } from 'vitest';

import { buildRssXml } from '@/lib/rss';
import { makePost } from '@/test/make-post';

describe('buildRssXml', () => {
  it('produces channel metadata and one item per post', () => {
    const xml = buildRssXml([
      makePost({ slug: 'a-post', title: 'A <Post> & Friends' }),
    ]);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<link>https://mkelley33.com/blog/a-post</link>');
    expect(xml).toContain('A &lt;Post&gt; &amp; Friends');
    expect(xml).not.toContain('<Post>');
  });

  it('handles zero posts', () => {
    const xml = buildRssXml([]);
    expect(xml).toContain('</channel>');
    expect(xml).not.toContain('<item>');
  });

  it('omits the item description element when a post has no excerpt', () => {
    const xml = buildRssXml([
      makePost({ excerpt: null, slug: 'no-excerpt-post' }),
    ]);
    const itemXml = xml.slice(xml.indexOf('<item>'), xml.indexOf('</item>'));
    expect(itemXml).toContain('<item>');
    expect(itemXml).not.toContain('<description>');
  });
});
