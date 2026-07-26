// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { highlightCode } from '@/lib/highlight';

describe('highlightCode', () => {
  it('returns dual-theme shiki html for a known language', async () => {
    const html = await highlightCode("const x = 'y';", 'ts');
    expect(html).toContain('shiki');
    expect(html).toContain('--shiki-dark');
  });

  it('falls back to plain text for unknown languages', async () => {
    const html = await highlightCode('whatever', 'not-a-language');
    expect(html).toContain('whatever');
  });
});
