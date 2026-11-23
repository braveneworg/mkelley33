/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Rich text as the editor stores it, built by hand for specs. Each builder
 * returns the node the editor would have saved, so a spec can say
 * `paragraph('Hello ', link('https://example.com', 'there'))` and get the
 * JSON a Terminal Block holds.
 */

import type { TerminalBlock } from '@/payload-types';

export type RichTextBody = TerminalBlock['body'];

type TextNode = RichTextBody['root']['children'][number];

/** Bold, as the editor's text format flag. */
export const BOLD = 1;

export const text = (value: string, format = 0): TextNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
});

const toNodes = (children: readonly (string | TextNode)[]): TextNode[] =>
  children.map((child) => (typeof child === 'string' ? text(child) : child));

const element = (
  type: string,
  children: readonly (string | TextNode)[],
  extra: Record<string, unknown> = {}
): TextNode => ({
  children: toNodes(children),
  direction: 'ltr',
  format: '',
  indent: 0,
  type,
  version: 1,
  ...extra,
});

export const paragraph = (...children: (string | TextNode)[]): TextNode =>
  element('paragraph', children, { textFormat: 0, textStyle: '' });

export const heading = (tag: string, ...children: (string | TextNode)[]): TextNode =>
  element('heading', children, { tag });

/** A bulleted list: one array of children for each item. */
export const bullets = (...items: (string | TextNode)[][]): TextNode =>
  element(
    'list',
    items.map((children, index) => element('listitem', children, { value: index + 1 })),
    { listType: 'bullet', start: 1, tag: 'ul' }
  );

/** A link to an address the owner typed. */
export const link = (url: string, ...children: (string | TextNode)[]): TextNode =>
  element('link', children, { fields: { linkType: 'custom', newTab: false, url }, version: 3 });

/** An address the editor turned into a link by itself. */
export const autolink = (url: string): TextNode =>
  element('autolink', [url], { fields: { linkType: 'custom', newTab: false, url }, version: 2 });

/**
 * A link to a record the owner picked. `value` is the record as a read
 * resolves it, or its bare id — what is stored, and what is left when the
 * record could not be resolved.
 */
export const docLink = (
  relationTo: string,
  value: string | { [key: string]: string; id: string },
  ...children: (string | TextNode)[]
): TextNode =>
  element('link', children, {
    fields: { doc: { relationTo, value }, linkType: 'internal', newTab: false },
    version: 3,
  });

/** A link to a Page the owner picked. */
export const pageLink = (
  page: string | { _status: string; id: string; slug: string },
  ...children: (string | TextNode)[]
): TextNode => docLink('pages', page, ...children);

export const richText = (...children: TextNode[]): RichTextBody => ({
  root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 },
});
