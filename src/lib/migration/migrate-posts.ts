import { promises as fs } from 'fs';
import path from 'path';

import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical';
import matter from 'gray-matter';

import type { CODE_LANGUAGES } from '@/collections/blocks/code-block';
import type { Post } from '@/payload-types';

import type { Payload } from 'payload';

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
export const stripMdxArtifacts = (markdown: string): string =>
  markdown
    .split('\n')
    .filter(
      (line) =>
        !/^\s*(import\s.+from\s.+|export\s)/.test(line) && !/^\s*<\/?[A-Z][A-Za-z]*/.test(line)
    )
    .join('\n');

/** Convert inline `<a href="...">text</a>` HTML anchors found in prose
 * markdown into standard markdown links (`[text](url)`).
 *
 * `stripMdxArtifacts` only strips capital-letter JSX component tags, so
 * hand-written lowercase HTML anchors in the legacy posts pass through
 * untouched and `convertMarkdownToLexical` otherwise emits them as literal
 * text nodes instead of link nodes. The `href` attribute is located
 * independently of its position among other attributes (e.g. `target`,
 * `rel`), and anchor text spanning multiple lines is collapsed to a single
 * space-joined line since markdown link text is not multi-line.
 *
 * Only ever applied to prose segments: `splitFences` extracts fenced code
 * blocks before prose processing runs, so literal HTML inside a code
 * sample (e.g. a JSX `<div>`) is never passed through this function. */
export const convertInlineAnchors = (markdown: string): string =>
  markdown.replace(
    /<a\s+[^<>]*?href\s*=\s*(["'])([^"']*)\1[^<>]*?>([\s\S]*?)<\/a>/gi,
    (_match, _quote: string, href: string, text: string) => {
      // Markdown link destinations don't reliably survive literal,
      // unescaped parentheses (e.g. a URL containing `...(PoP).` breaks
      // convertMarkdownToLexical's link parsing and it falls back to
      // literal `[text](url)` text instead of a link node).
      // Percent-encoding is a semantically-equivalent, parser-safe way to
      // carry them through.
      const safeHref = href.replace(/\(/g, '%28').replace(/\)/g, '%29');
      return `[${text.replace(/\s+/g, ' ').trim()}](${safeHref})`;
    }
  );

// A Map rather than an object literal: the token comes from arbitrary markdown
// fence info, and a plain-object lookup would resolve inherited keys such as
// `constructor` or `__proto__` to Object internals instead of falling through
// to the `text` default.
const LANGUAGE_ALIASES = new Map<string, CodeLanguage>([
  ['bash', 'bash'],
  ['css', 'css'],
  ['html', 'html'],
  ['javascript', 'js'],
  ['js', 'js'],
  ['json', 'json'],
  ['jsx', 'jsx'],
  ['markdown', 'md'],
  ['md', 'md'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['text', 'text'],
  ['ts', 'ts'],
  ['tsx', 'tsx'],
  ['typescript', 'ts'],
  ['zsh', 'bash'],
]);

export const normalizeLanguage = (info: string): CodeLanguage => {
  const token = info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return LANGUAGE_ALIASES.get(token) ?? 'text';
};

export const splitFences = (markdown: string): Segment[] => {
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
};

const fenceId = (): string =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const fenceToBlockNode = (segment: FenceSegment): Record<string, unknown> => ({
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
});

export const migratePosts = async (
  payload: Payload,
  contentDir: string
): Promise<MigrationResult> => {
  const result: MigrationResult = { created: [], updated: [] };
  const editorConfig = await editorConfigFactory.default({
    config: payload.config,
  });
  // `contentDir` is an operator-supplied path from the `migrate:posts` script,
  // not request input — reading it dynamically is this function's entire job,
  // so the non-literal-path warnings here are expected rather than suppressible
  // by restructuring.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const files = (await fs.readdir(contentDir)).filter((f) => f.endsWith('.mdx'));

  for (const file of files.sort()) {
    const slug = path.basename(file, '.mdx');
    // eslint-disable-next-line security/detect-non-literal-fs-filename
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
        markdown: stripMdxArtifacts(convertInlineAnchors(segment.markdown)),
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

    const title = typeof front.title === 'string' ? front.title : slug;
    const publishedAt = new Date(
      typeof front.date === 'string' || front.date instanceof Date ? front.date : Date.now()
    ).toISOString();
    const excerpt = typeof front.description === 'string' ? front.description : undefined;

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
};
