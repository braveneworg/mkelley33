/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cvTextField, plainTextAsRichText } from '@/collections/page-blocks/cv-text';
import { link, paragraph, richText } from '@/test/lexical';

import type { FieldHook } from 'payload';

/** Runs the field's read hooks over a stored value, as a read does. */
const read = async (stored: unknown): Promise<unknown> => {
  let value = stored;
  for (const hook of cvTextField('text').hooks?.afterRead ?? []) {
    value = await hook({ value } as Parameters<FieldHook>[0]);
  }
  return value;
};

describe('plainTextAsRichText', () => {
  it('turns a line into the paragraph the editor would have stored', () => {
    expect(plainTextAsRichText('Ten years.')).toEqual(richText(paragraph('Ten years.')));
  });

  it('gives each line a paragraph of its own', () => {
    expect(plainTextAsRichText('Ten years.\nMostly React.')).toEqual(
      richText(paragraph('Ten years.'), paragraph('Mostly React.'))
    );
  });

  it('drops the empty lines between paragraphs and the space around them', () => {
    expect(plainTextAsRichText('  Ten years.\r\n\r\n Mostly React.\n')).toEqual(
      richText(paragraph('Ten years.'), paragraph('Mostly React.'))
    );
  });

  it('has nothing to show for text that is only space', () => {
    expect(plainTextAsRichText(' \n ')).toBeNull();
  });
});

describe('cvTextField', () => {
  /** What the live site held before these fields took links. */
  it('reads plain text stored before as rich text', async () => {
    await expect(read('Ten years.')).resolves.toEqual(richText(paragraph('Ten years.')));
  });

  it('reads rich text as it is stored', async () => {
    const stored = richText(paragraph('See ', link('https://example.com', 'the docs')));

    await expect(read(stored)).resolves.toBe(stored);
  });

  it('reads a field left empty as empty', async () => {
    await expect(read(null)).resolves.toBeNull();
  });

  it('is required only when asked to be', () => {
    expect([
      cvTextField('detail').required,
      cvTextField('title', { required: true }).required,
    ]).toEqual([false, true]);
  });
});
