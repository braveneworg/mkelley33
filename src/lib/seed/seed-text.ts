/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Rich text as the Seed carries it. The editor stores a link to a Page, and
 * a picture, as a database id, which is different in every database. In the
 * Seed a link names its Page by address and a picture names a file with its
 * alt text, exactly as a Block's link and picture do. The fill turns them
 * into ids (`toStoredText`) and Capture turns ids back (`toSeedText`).
 *
 * Nothing else that points at a record can be carried: a link to any other
 * kind of record, or the editor's card for one. Capture leaves those out and
 * says so; the schema refuses them, so a Seed cannot hold a stray id.
 */

import { z } from 'zod';

import { pageSlug, type PictureSeed, pictureSeedSchema } from '@/lib/seed/seed-values';

/** One node of the editor's tree. What it holds depends on its `type`. */
interface TextNode {
  [key: string]: unknown;
}

/** Rich text as the editor stores it, as far as this module looks into it. */
export interface RichText {
  [key: string]: unknown;
  root: { [key: string]: unknown; children: TextNode[] };
}

const PAGES = 'pages';
const MEDIA = 'media';

const isRecord = (value: unknown): value is TextNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const childrenOf = ({ children }: TextNode): null | TextNode[] =>
  Array.isArray(children) ? children.filter(isRecord) : null;

/** The record a link the owner picked points at, or null for any other node. */
const linkedRecord = ({ fields, type }: TextNode): null | TextNode => {
  if (type !== 'link' || !isRecord(fields) || fields.linkType !== 'internal') {
    return null;
  }
  return isRecord(fields.doc) ? fields.doc : {};
};

const withLinkedPage = (node: TextNode, value: string): TextNode => ({
  ...node,
  fields: { ...(isRecord(node.fields) ? node.fields : {}), doc: { relationTo: PAGES, value } },
});

/** A stored id, bare or on the record a read resolved it to; empty when it is neither. */
export const storedId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return isRecord(value) && typeof value.id === 'string' ? value.id : '';
};

/** The words a node shows. */
const wordsOf = (node: TextNode): string =>
  typeof node.text === 'string' ? node.text : (childrenOf(node) ?? []).map(wordsOf).join('');

/** The nodes that take a node's place: itself, a replacement, its children, or nothing. */
type Replace = (node: TextNode) => Promise<TextNode[]>;

const mapNodes = async (nodes: readonly TextNode[], replace: Replace): Promise<TextNode[]> => {
  const mapped: TextNode[] = [];
  // One at a time: a replacement may upload, and uploads keep the text's order.
  for (const node of nodes) {
    const children = childrenOf(node);
    const rebuilt =
      children === null ? node : { ...node, children: await mapNodes(children, replace) };
    mapped.push(...(await replace(rebuilt)));
  }
  return mapped;
};

const mapText = async <T extends RichText>(body: T, replace: Replace): Promise<T> => ({
  ...body,
  root: { ...body.root, children: await mapNodes(body.root.children, replace) },
});

/** What the fill has to hand to turn the Seed's text into stored text. */
export interface StoredRefs {
  /** The id of every Page that exists so far, by its address. */
  readonly pageIds: ReadonlyMap<string, string>;
  /** Uploads a picture and resolves to the id of the upload. */
  readonly upload: (picture: PictureSeed) => Promise<string>;
}

/** The Seed's text as the database stores it: ids where the Seed has names. */
export const toStoredText = <T extends RichText>(
  body: T,
  { pageIds, upload }: StoredRefs
): Promise<T> =>
  mapText(body, async (node) => {
    const linked = linkedRecord(node);
    if (linked !== null) {
      const slug = String(linked.value);
      const id = pageIds.get(slug);
      if (id === undefined) {
        throw new Error(`a link in the text points at the ${slug} Page, which does not exist yet`);
      }
      return [withLinkedPage(node, id)];
    }
    return node.type === 'upload'
      ? [{ ...node, value: await upload(pictureSeedSchema.parse(node.value)) }]
      : [node];
  });

/** What Capture has to hand to turn stored text into the Seed's. */
export interface SeedRefs {
  /** Called with each thing the Seed could not carry, in words. */
  readonly leftOut: (what: string) => void;
  /** The address of the Page with this id, when visitors are served it. */
  readonly pageSlug: (id: string) => string | undefined;
  /** The Media upload with this id as the Seed carries it, or null when it cannot. */
  readonly picture: (id: string) => Promise<null | PictureSeed>;
}

const seedLink = (node: TextNode, linked: TextNode, refs: SeedRefs): TextNode[] => {
  const slug = linked.relationTo === PAGES ? refs.pageSlug(storedId(linked.value)) : undefined;
  if (slug !== undefined) {
    return [withLinkedPage(node, slug)];
  }
  refs.leftOut(
    `the link on "${wordsOf(node)}": it points at a Page that is not published, ` +
      'or at another kind of record'
  );
  return childrenOf(node) ?? [];
};

const seedPicture = async (node: TextNode, refs: SeedRefs): Promise<TextNode[]> => {
  const picture = node.relationTo === MEDIA ? await refs.picture(storedId(node.value)) : null;
  if (picture !== null) {
    return [{ ...node, value: picture }];
  }
  refs.leftOut(
    'a picture in the text: its upload is gone, or is not a kind of picture the Seed carries'
  );
  return [];
};

/**
 * Stored text as the Seed carries it. What cannot be carried is left out the
 * way visitors already see it: a link to a Page they are not served keeps
 * its words and loses the link.
 */
export const toSeedText = <T extends RichText>(body: T, refs: SeedRefs): Promise<T> =>
  mapText(body, async (node) => {
    const linked = linkedRecord(node);
    if (linked !== null) {
      return seedLink(node, linked, refs);
    }
    if (node.type === 'upload') {
      return seedPicture(node, refs);
    }
    if (node.type === 'relationship') {
      refs.leftOut('a card for another record in the text');
      return [];
    }
    return [node];
  });

const everyNode = (nodes: readonly TextNode[]): TextNode[] =>
  nodes.flatMap((node) => [node, ...everyNode(childrenOf(node) ?? [])]);

/** The addresses of the Pages the Seed's text links to. */
export const pagesLinkedInText = ({ root }: RichText): string[] =>
  everyNode(root.children).flatMap((node) => {
    const linked = linkedRecord(node);
    return linked !== null && typeof linked.value === 'string' ? [linked.value] : [];
  });

/** The pictures the Seed's text shows. */
export const picturesInText = ({ root }: RichText): PictureSeed[] =>
  everyNode(root.children).flatMap((node) => {
    const picture = node.type === 'upload' ? pictureSeedSchema.safeParse(node.value) : null;
    return picture?.success ? [picture.data] : [];
  });

/** True when a node points at nothing, or only at what the Seed can name. */
const isCarried = (node: TextNode): boolean => {
  const linked = linkedRecord(node);
  if (linked !== null) {
    return linked.relationTo === PAGES && pageSlug.safeParse(linked.value).success;
  }
  if (node.type === 'upload') {
    return node.relationTo === MEDIA && pictureSeedSchema.safeParse(node.value).success;
  }
  return node.type !== 'relationship';
};

/**
 * Rich text in a Seed file: the frame Payload's own type requires, whatever
 * the editor puts inside it, and no pointer at a record except the two the
 * Seed can name.
 */
export const richTextSchema = z
  .looseObject({
    root: z.looseObject({
      children: z.array(z.looseObject({ type: z.string(), version: z.number() })),
      direction: z.enum(['ltr', 'rtl']).nullable(),
      format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
      indent: z.number(),
      type: z.string(),
      version: z.number(),
    }),
  })
  .refine(({ root }) => everyNode(root.children).every(isCarried), {
    message:
      'the text points at a record the Seed cannot name: a link must name a Page by address, ' +
      'and a picture a file in the Seed',
  });
