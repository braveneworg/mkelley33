/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  InlineToolbarFeature,
  lexicalEditor,
  LinkFeature,
  ParagraphFeature,
} from '@payloadcms/richtext-lexical';

import type { FieldHook, RichTextField } from 'payload';

/** One node of the editor's tree. */
interface TextNode {
  [key: string]: unknown;
  type: string;
  version: number;
}

/** Rich text as the editor stores it. */
export interface CvRichText {
  [key: string]: unknown;
  root: {
    children: TextNode[];
    direction: 'ltr' | 'rtl' | null;
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start';
    indent: number;
    type: string;
    version: number;
  };
}

const LINE_BREAKS = /\r?\n/;

const paragraphOf = (line: string): TextNode => ({
  children: [
    { detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 },
  ],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
  type: 'paragraph',
  version: 1,
});

/**
 * Plain text as the editor would have stored it: a paragraph for each line
 * that has words on it, or null when none does.
 */
export const plainTextAsRichText = (value: string): CvRichText | null => {
  const lines = value
    .split(LINE_BREAKS)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.length === 0
    ? null
    : {
        root: {
          children: lines.map(paragraphOf),
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'root',
          version: 1,
        },
      };
};

/**
 * The text of the CV was plain text until it took links, and the live site
 * stored it that way: in the Page, and in every version the admin keeps
 * (docs/adr/0002 keeps them all). Nothing rewrites those records. A read
 * hands plain text over as the rich text it would have been, so the site
 * shows it and the editor opens it, and the Page is stored as rich text the
 * next time the owner saves it. An old version stays as it was stored, which
 * is why this stays for good.
 */
const readPlainTextAsRichText: FieldHook = ({ value }) =>
  typeof value === 'string' ? plainTextAsRichText(value) : value;

/**
 * The editor for a line of the CV: words and links, and nothing else. The
 * CV's own Blocks give it its headings and lists. A link points at an
 * address or at a Page — the one kind of record with an address of its own
 * here (see `BlockText`).
 */
const cvTextEditor = lexicalEditor({
  features: [
    ParagraphFeature(),
    LinkFeature({ enabledCollections: ['pages'] }),
    InlineToolbarFeature(),
  ],
});

/**
 * A line or a paragraph of the CV, which the owner can put links in. The
 * site shows it through `CvText`.
 */
export const cvTextField = (
  name: string,
  { label, required = false }: { label?: string; required?: boolean } = {}
): RichTextField => ({
  name,
  type: 'richText',
  editor: cvTextEditor,
  hooks: { afterRead: [readPlainTextAsRichText] },
  ...(label === undefined ? {} : { label }),
  required,
});
