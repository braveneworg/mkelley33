// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyTurnstileToken } from '@/lib/turnstile';

describe('verifyTurnstileToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when cloudflare reports success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      ),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(true);
  });

  it('fails closed on failure, non-200, and network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 200 }),
      ),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(verifyTurnstileToken('tok')).resolves.toBe(false);
  });
});
