/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { pagesLinkedFromPost, picturesInPost, postsSeedSchema } from '@/lib/seed/post-seed';
import { docLink, paragraph, richText } from '@/test/lexical';

const post = {
  body: richText(paragraph('Hello.')),
  excerpt: 'A first post.',
  publishedAt: '2026-01-02T12:00:00.000Z',
  slug: 'hello-world',
  tags: ['react'],
  title: 'Hello, world',
};

const HEADSHOT = { alt: 'the owner', file: 'files/headshot.webp' };
const picture = { relationTo: 'media', type: 'upload', value: HEADSHOT, version: 3 };

describe('postsSeedSchema', () => {
  it('accepts a list of posts', () => {
    expect(postsSeedSchema.parse([post])).toEqual([post]);
  });

  /** The Seed starts without posts: they arrive with the first Capture. */
  it('accepts no posts at all', () => {
    expect(postsSeedSchema.parse([])).toEqual([]);
  });

  it('accepts a post with no excerpt and no tags', () => {
    const bare = { ...post, excerpt: null, tags: [] };

    expect(postsSeedSchema.parse([bare])).toEqual([bare]);
  });

  it('rejects two posts with the same slug', () => {
    expect(postsSeedSchema.safeParse([post, post]).success).toBe(false);
  });

  it('rejects a slug that could not be a URL fragment', () => {
    expect(postsSeedSchema.safeParse([{ ...post, slug: 'Hello World' }]).success).toBe(false);
  });

  it('rejects a date that is not a full timestamp', () => {
    expect(postsSeedSchema.safeParse([{ ...post, publishedAt: 'last week' }]).success).toBe(false);
  });

  /** Every post in the Seed is published, so there is no status to carry. */
  it('rejects a key it does not know', () => {
    expect(postsSeedSchema.safeParse([{ ...post, status: 'draft' }]).success).toBe(false);
  });

  it('rejects text that points at a record the Seed cannot name', () => {
    const body = richText(paragraph(docLink('users', 'someone', 'the owner')));

    expect(postsSeedSchema.safeParse([{ ...post, body }]).success).toBe(false);
  });
});

describe('pagesLinkedFromPost', () => {
  it('lists the Pages the post links to', () => {
    const body = richText(paragraph(docLink('pages', 'contact', 'get in touch')));

    expect(pagesLinkedFromPost({ ...post, body })).toEqual(['contact']);
  });
});

describe('picturesInPost', () => {
  it('lists the pictures the post shows', () => {
    expect(picturesInPost({ ...post, body: richText(picture) })).toEqual([HEADSHOT]);
  });
});
