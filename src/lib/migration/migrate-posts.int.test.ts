// @vitest-environment node
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { TestPayload } from '@/test/payload-harness';

import { migratePosts } from '@/lib/migration/migrate-posts';
import { createTestPayload } from '@/test/payload-harness';

const CONTENT_DIR = path.resolve(process.cwd(), 'scripts/content');
const EXPECTED_SLUGS = [
  'create-a-nextjs-blog',
  'how-to-tx-node-repl',
  'npm-ing-and-npx-ing-commands',
  'using-recaptcha-v2-with-formik',
];

let harness: TestPayload;

beforeAll(async () => {
  harness = await createTestPayload();
});

afterAll(async () => {
  await harness.teardown();
});

describe('migratePosts', () => {
  it('creates all four legacy posts with exact slugs, published', async () => {
    const result = await migratePosts(harness.payload, CONTENT_DIR);
    expect(result.created.sort()).toEqual(EXPECTED_SLUGS);
    const found = await harness.payload.find({
      collection: 'posts',
      limit: 10,
      where: { status: { equals: 'published' } },
    });
    expect(found.docs.map((d) => d.slug).sort()).toEqual(EXPECTED_SLUGS);
  });

  it('preserves original dates and titles', async () => {
    const post = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'create-a-nextjs-blog' } },
    });
    expect(post.docs[0]?.publishedAt).toContain('2024-02');
    expect(post.docs[0]?.title.toLowerCase()).toContain('next.js');
  });

  it('converts fenced code into content (body is non-trivial)', async () => {
    const post = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'create-a-nextjs-blog' } },
    });
    const json = JSON.stringify(post.docs[0]?.body);
    expect(json.length).toBeGreaterThan(500);
    expect(json).toMatch(/"type":\s*"block"|"type":\s*"code"/);
  });

  it('is idempotent — second run updates instead of duplicating', async () => {
    const second = await migratePosts(harness.payload, CONTENT_DIR);
    expect(second.created).toEqual([]);
    expect(second.updated.sort()).toEqual(EXPECTED_SLUGS);
    const all = await harness.payload.find({ collection: 'posts', limit: 20 });
    expect(all.totalDocs).toBe(4);
  });

  it('skips a whitespace-only prose segment between two fences instead of converting it', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'migrate-posts-blank-segment-'),
    );
    try {
      await fs.writeFile(
        path.join(tempDir, 'blank-segment-post.mdx'),
        [
          '---',
          "title: 'Blank Segment Fixture'",
          "date: '2024-05-01'",
          '---',
          '```text',
          'first',
          '```',
          '',
          '```text',
          'second',
          '```',
          '',
        ].join('\n'),
        'utf8',
      );

      const result = await migratePosts(harness.payload, tempDir);

      expect(result.created).toEqual(['blank-segment-post']);
      const found = await harness.payload.find({
        collection: 'posts',
        where: { slug: { equals: 'blank-segment-post' } },
      });
      const children = found.docs[0]?.body.root.children ?? [];
      // Only the two fenced code blocks should become children — the
      // whitespace-only prose between/after them must be skipped rather
      // than converted into an empty lexical node.
      expect(children).toHaveLength(2);
      expect(children.every((child) => child.type === 'block')).toBe(true);
    } finally {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  });

  it('falls back to the slug and the current time when frontmatter has no title or date', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'migrate-posts-no-frontmatter-'),
    );
    try {
      const before = Date.now();
      await fs.writeFile(
        path.join(tempDir, 'no-frontmatter-post.mdx'),
        'Just a plain paragraph with no frontmatter block at all.\n',
        'utf8',
      );

      const result = await migratePosts(harness.payload, tempDir);
      const after = Date.now();

      expect(result.created).toEqual(['no-frontmatter-post']);
      const found = await harness.payload.find({
        collection: 'posts',
        where: { slug: { equals: 'no-frontmatter-post' } },
      });
      const doc = found.docs[0];
      // No `title:` in frontmatter — falls back to the filename-derived slug.
      expect(doc?.title).toBe('no-frontmatter-post');
      // No `date:` in frontmatter — falls back to "now" rather than throwing
      // or defaulting to the epoch.
      const publishedAtMs = new Date(doc?.publishedAt ?? 0).getTime();
      expect(publishedAtMs).toBeGreaterThanOrEqual(before);
      expect(publishedAtMs).toBeLessThanOrEqual(after);
    } finally {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  });
});
