/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'vitest';

import { normalizeLanguage, splitFences } from '@/lib/migration/migrate-posts';

describe('splitFences', () => {
  it('splits prose, a fence, and trailing prose into three segments in order', () => {
    const markdown = [
      'Some intro prose.',
      '',
      '```shell showLineNumbers',
      '$ npx create-next-app',
      '```',
      '',
      'Some trailing prose.',
    ].join('\n');

    const segments = splitFences(markdown);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.type).toBe('prose');
    expect(segments[1]).toMatchObject({
      code: '$ npx create-next-app',
      language: 'bash',
      type: 'fence',
    });
    expect(segments[2]?.type).toBe('prose');
  });

  it('keeps import statements inside a fence untouched', () => {
    const markdown = [
      '```javascript',
      "import dotenv from 'dotenv';",
      'export default dotenv;',
      '```',
    ].join('\n');

    const fenceSegments = splitFences(markdown).filter((s) => s.type === 'fence');

    expect(fenceSegments).toHaveLength(1);
    expect(fenceSegments[0].code).toContain("import dotenv from 'dotenv';");
    expect(fenceSegments[0].code).toContain('export default dotenv;');
  });

  it('normalizes CRLF line endings before splitting', () => {
    const markdown = 'before\r\n```ts\r\nconst a = 1;\r\n```\r\nafter\r\n';

    const segments = splitFences(markdown);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.type).toBe('prose');
    expect(segments[1]).toMatchObject({
      code: 'const a = 1;',
      language: 'ts',
      type: 'fence',
    });
    expect(segments[2]?.type).toBe('prose');
  });
});

describe('normalizeLanguage', () => {
  it('maps typescript to ts', () => {
    expect(normalizeLanguage('typescript')).toBe('ts');
  });

  it('maps shell with trailing directives to bash', () => {
    expect(normalizeLanguage('shell showLineNumbers')).toBe('bash');
  });

  it('falls back to text for unknown languages', () => {
    expect(normalizeLanguage('ruby')).toBe('text');
  });

  it('falls back to text for object prototype keys', () => {
    expect(normalizeLanguage('constructor')).toBe('text');
    expect(normalizeLanguage('__proto__')).toBe('text');
    expect(normalizeLanguage('toString')).toBe('text');
  });
});
