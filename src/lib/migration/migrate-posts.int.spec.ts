/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { migratePosts } from '@/lib/migration/migrate-posts';
import type { TestPayload } from '@/test/payload-harness';
import { createTestPayload } from '@/test/payload-harness';

const CONTENT_DIR = path.resolve(process.cwd(), 'scripts/content');
const EXPECTED_SLUGS = [
  'create-a-nextjs-blog',
  'how-to-tx-node-repl',
  'npm-ing-and-npx-ing-commands',
  'using-recaptcha-v2-with-formik',
];

interface LinkNodeInfo {
  text: string;
  url: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Recursively collect every `text` string found in a Lexical node tree
 * (including inside link nodes' children), for asserting on rendered prose. */
const collectTextValues = (node: unknown, out: string[] = []): string[] => {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectTextValues(child, out);
    }
    return out;
  }
  if (isRecord(node)) {
    if (typeof node.text === 'string') {
      out.push(node.text);
    }
    if (node.children !== undefined) {
      collectTextValues(node.children, out);
    }
  }
  return out;
};

/** Recursively collect every Lexical `link` node's URL and rendered text. */
const collectLinkNodes = (node: unknown, out: LinkNodeInfo[] = []): LinkNodeInfo[] => {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectLinkNodes(child, out);
    }
    return out;
  }
  if (isRecord(node)) {
    if (node.type === 'link' && isRecord(node.fields)) {
      const url = typeof node.fields.url === 'string' ? node.fields.url : '';
      out.push({ text: collectTextValues(node.children).join(''), url });
    }
    if (node.children !== undefined) {
      collectLinkNodes(node.children, out);
    }
  }
  return out;
};

let harness: TestPayload;
// Test order is shuffled (vitest sequence.shuffle.tests), so the initial
// migration run happens once here and every test stands alone against it.
let firstRun: Awaited<ReturnType<typeof migratePosts>>;

beforeAll(async () => {
  harness = await createTestPayload();
  firstRun = await migratePosts(harness.payload, CONTENT_DIR);
});

afterAll(async () => {
  await harness.teardown();
});

describe('migratePosts', () => {
  it('creates all four legacy posts with exact slugs, published', async () => {
    expect(firstRun.created.sort()).toEqual(EXPECTED_SLUGS);
    const found = await harness.payload.find({
      collection: 'posts',
      limit: 10,
      where: { slug: { in: EXPECTED_SLUGS }, status: { equals: 'published' } },
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

  it('converts inline HTML anchors in prose to real markdown links, for every post', async () => {
    for (const slug of EXPECTED_SLUGS) {
      const post = await harness.payload.find({
        collection: 'posts',
        where: { slug: { equals: slug } },
      });
      const body = post.docs[0]?.body;
      const textValues = collectTextValues(body?.root.children);
      const rawAnchors = textValues.filter((text) => text.includes('<a '));
      expect(
        rawAnchors,
        `slug "${slug}" still has literal <a> tags: ${JSON.stringify(rawAnchors)}`
      ).toEqual([]);
    }
  });

  it('emits real Lexical link nodes (not literal text) for the posts with inline anchors', async () => {
    const nextjsPost = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'create-a-nextjs-blog' } },
    });
    const nextjsLinks = collectLinkNodes(nextjsPost.docs[0]?.body.root.children);
    const mdxLink = nextjsLinks.find((link) => link.url === 'https://mdxjs.com/');
    expect(mdxLink).toBeDefined();
    expect(mdxLink?.text.trim().length).toBeGreaterThan(0);

    const npmPost = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'npm-ing-and-npx-ing-commands' } },
    });
    const npmLinks = collectLinkNodes(npmPost.docs[0]?.body.root.children);
    const semverLink = npmLinks.find((link) => link.url === 'https://semver.org/');
    expect(semverLink).toBeDefined();
    expect(semverLink?.text.trim().length).toBeGreaterThan(0);
  });

  it('leaves the <div> inside the recaptcha code fence untouched (regression guard)', async () => {
    const post = await harness.payload.find({
      collection: 'posts',
      where: { slug: { equals: 'using-recaptcha-v2-with-formik' } },
    });
    const json = JSON.stringify(post.docs[0]?.body);
    expect(json).toContain('<div');
  });

  it('is idempotent — second run updates instead of duplicating', async () => {
    const second = await migratePosts(harness.payload, CONTENT_DIR);
    expect(second.created).toEqual([]);
    expect(second.updated.sort()).toEqual(EXPECTED_SLUGS);
    const all = await harness.payload.find({
      collection: 'posts',
      limit: 20,
      where: { slug: { in: EXPECTED_SLUGS } },
    });
    expect(all.totalDocs).toBe(4);
  });

  it('skips a whitespace-only prose segment between two fences instead of converting it', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-posts-blank-segment-'));
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
        'utf8'
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

  it('handles an empty fence without crashing, producing an empty code block', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-posts-empty-fence-'));
    try {
      await fs.writeFile(
        path.join(tempDir, 'empty-fence-post.mdx'),
        [
          '---',
          "title: 'Empty Fence Fixture'",
          "date: '2024-06-01'",
          '---',
          'Some intro prose before an empty fence.',
          '',
          '```text',
          '```',
          '',
          'Some prose after a whitespace-only fence.',
          '',
          '```text',
          '   ',
          '```',
          '',
        ].join('\n'),
        'utf8'
      );

      const result = await migratePosts(harness.payload, tempDir);

      expect(result.created).toEqual(['empty-fence-post']);
      const found = await harness.payload.find({
        collection: 'posts',
        where: { slug: { equals: 'empty-fence-post' } },
      });
      const children = found.docs[0]?.body.root.children ?? [];
      const codeBlocks = children.filter((child) => {
        const fields = isRecord(child.fields) ? child.fields : undefined;
        return child.type === 'block' && fields?.blockType === 'code';
      });
      // Both fences (truly empty, and whitespace-only) survive as code
      // blocks rather than crashing the migration or being silently
      // dropped — the fence content is preserved verbatim (only the final
      // newline before the closing ``` is trimmed), so a whitespace-only
      // fence keeps its whitespace rather than being collapsed to ''.
      expect(codeBlocks).toHaveLength(2);
      const [emptyBlock, whitespaceBlock] = codeBlocks;
      const emptyFields = isRecord(emptyBlock?.fields) ? emptyBlock.fields : undefined;
      const whitespaceFields = isRecord(whitespaceBlock?.fields)
        ? whitespaceBlock.fields
        : undefined;
      expect(emptyFields?.code).toBe('');
      expect(whitespaceFields?.code).toBe('   ');
    } finally {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  });

  it('falls back to the slug and the current time when frontmatter has no title or date', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-posts-no-frontmatter-'));
    try {
      const before = Date.now();
      await fs.writeFile(
        path.join(tempDir, 'no-frontmatter-post.mdx'),
        'Just a plain paragraph with no frontmatter block at all.\n',
        'utf8'
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
