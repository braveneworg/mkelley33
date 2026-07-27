/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'vitest';

import {
  computeReadTime,
  extractLexicalText,
  readTimeMinutes,
} from '@/collections/hooks/compute-read-time';

const lexicalWithText = (words: string[]): Record<string, unknown> => ({
  root: {
    children: [
      {
        children: words.map((text) => ({ text, type: 'text' })),
        type: 'paragraph',
      },
    ],
    type: 'root',
  },
});

describe('extractLexicalText', () => {
  it('collects text from nested nodes', () => {
    expect(extractLexicalText(lexicalWithText(['hello', 'world']))).toContain('hello');
  });

  it('returns empty string for malformed input', () => {
    expect(extractLexicalText(null)).toBe('');
    expect(extractLexicalText({ root: 42 })).toBe('');
  });
});

describe('readTimeMinutes', () => {
  it('floors at one minute for short text', () => {
    expect(readTimeMinutes(lexicalWithText(['just', 'a', 'few', 'words']))).toBe(1);
  });

  it('computes ceil(words/200)', () => {
    const words = Array.from({ length: 401 }, (_, i) => `w${i}`);
    expect(readTimeMinutes(lexicalWithText(words))).toBe(3);
  });
});

describe('computeReadTime hook', () => {
  it('sets readTime when the body is present', () => {
    const data = { body: lexicalWithText(Array.from({ length: 400 }, () => 'word')) };

    expect(computeReadTime({ data } as never)).toMatchObject({ readTime: 2 });
  });

  it('leaves data untouched when the body is absent', () => {
    const data = { title: 'no body here' };

    expect(computeReadTime({ data } as never)).toEqual({ title: 'no body here' });
  });
});
