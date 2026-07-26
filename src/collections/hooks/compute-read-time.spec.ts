import { describe, expect, it } from 'vitest';

import { extractLexicalText, readTimeMinutes } from '@/collections/hooks/compute-read-time';

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
