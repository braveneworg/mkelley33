/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { wordsOfText } from '@/lib/pages/text-words';
import { link, paragraph, richText } from '@/test/lexical';

describe('wordsOfText', () => {
  it('reads the words of a paragraph', () => {
    expect(wordsOfText(richText(paragraph('Ten years.')))).toBe('Ten years.');
  });

  it('reads the words of a link in their place', () => {
    const text = richText(paragraph('Built ', link('https://example.com', 'a project'), '.'));

    expect(wordsOfText(text)).toBe('Built a project.');
  });

  it('puts a space between paragraphs', () => {
    expect(wordsOfText(richText(paragraph('Ten years.'), paragraph('Mostly React.')))).toBe(
      'Ten years. Mostly React.'
    );
  });

  /** What the editor leaves behind when its words are deleted. */
  it('finds no words in an empty paragraph', () => {
    expect(wordsOfText(richText(paragraph()))).toBe('');
  });

  it('finds no words in a text that was never written', () => {
    expect(wordsOfText(null)).toBe('');
  });
});
