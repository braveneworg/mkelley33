import type { Payload } from 'payload';

import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical';
import { promises as fs } from 'fs';
import matter from 'gray-matter';
import path from 'path';

import type { Post } from '@/payload-types';

import { CODE_LANGUAGES } from '@/collections/blocks/code-block';

export interface MigrationResult {
  created: string[];
  updated: string[];
}

type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export interface FenceSegment {
  code: string;
  language: CodeLanguage;
  type: 'fence';
}
export interface ProseSegment {
  markdown: string;
  type: 'prose';
}
export type Segment = FenceSegment | ProseSegment;

/** Drop MDX-only lines (imports/exports/JSX component tags) that the
 * markdown converter cannot represent. */
export function stripMdxArtifacts(markdown: string): string {
  return markdown
    .split('\n')
    .filter(
      (line) =>
        !/^\s*(import\s.+from\s.+|export\s)/.test(line) &&
        !/^\s*<\/?[A-Z][A-Za-z]*/.test(line),
    )
    .join('\n');
}

export function normalizeLanguage(info: string): CodeLanguage {
  const token = info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  const map: Record<string, CodeLanguage> = {
    bash: 'bash',
    css: 'css',
    html: 'html',
    javascript: 'js',
    js: 'js',
    json: 'json',
    jsx: 'jsx',
    markdown: 'md',
    md: 'md',
    sh: 'bash',
    shell: 'bash',
    text: 'text',
    ts: 'ts',
    tsx: 'tsx',
    typescript: 'ts',
    zsh: 'bash',
  };
  return map[token] ?? 'text';
}

export function splitFences(markdown: string): Segment[] {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const segments: Segment[] = [];
  const fence = /^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
  let last = 0;
  for (const match of normalized.matchAll(fence)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ markdown: normalized.slice(last, index), type: 'prose' });
    }
    segments.push({
      code: match[2]?.replace(/\n$/, '') ?? '',
      language: normalizeLanguage(match[1] ?? ''),
      type: 'fence',
    });
    last = index + match[0].length;
  }
  if (last < normalized.length) {
    segments.push({ markdown: normalized.slice(last), type: 'prose' });
  }
  return segments;
}

function fenceId(): string {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

function fenceToBlockNode(segment: FenceSegment): Record<string, unknown> {
  return {
    fields: {
      blockName: '',
      blockType: 'code',
      code: segment.code,
      id: fenceId(),
      language: segment.language,
    },
    format: '',
    type: 'block',
    version: 2,
  };
}

export async function migratePosts(
  payload: Payload,
  contentDir: string,
): Promise<MigrationResult> {
  const result: MigrationResult = { created: [], updated: [] };
  const editorConfig = await editorConfigFactory.default({
    config: payload.config,
  });
  const files = (await fs.readdir(contentDir)).filter((f) =>
    f.endsWith('.mdx'),
  );

  for (const file of files.sort()) {
    const slug = path.basename(file, '.mdx');
    const raw = await fs.readFile(path.join(contentDir, file), 'utf8');
    const { content, data: front } = matter(raw);

    const children: unknown[] = [];
    for (const segment of splitFences(content)) {
      if (segment.type === 'fence') {
        children.push(fenceToBlockNode(segment));
        continue;
      }
      if (segment.markdown.trim().length === 0) {
        continue;
      }
      const proseState = convertMarkdownToLexical({
        editorConfig,
        markdown: stripMdxArtifacts(segment.markdown),
      });
      children.push(...proseState.root.children);
    }
    const body = {
      root: {
        children,
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as Post['body'];

    const title =
      typeof front.title === 'string' ? front.title : slug;
    const publishedAt = new Date(
      typeof front.date === 'string' || front.date instanceof Date
        ? front.date
        : Date.now(),
    ).toISOString();
    const excerpt =
      typeof front.description === 'string' ? front.description : undefined;

    const existing = await payload.find({
      collection: 'posts',
      limit: 1,
      where: { slug: { equals: slug } },
    });
    const data = {
      body,
      excerpt,
      publishedAt,
      slug,
      status: 'published' as const,
      title,
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: 'posts',
        data,
        id: existing.docs[0].id,
        overrideAccess: true,
      });
      result.updated.push(slug);
    } else {
      await payload.create({ collection: 'posts', data, overrideAccess: true });
      result.created.push(slug);
    }
  }
  return result;
}
