/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { GET } from '@/app/(site)/preview/route';

const auth = vi.fn();
const enable = vi.fn();
const disable = vi.fn();

vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ auth })) }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('next/headers', () => ({ draftMode: async () => ({ disable, enable }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));

const request = (query: string): Request => new Request(`https://mkelley33.com/preview${query}`);

beforeEach(() => {
  auth.mockReset();
  enable.mockReset();
  disable.mockReset();
});

describe('GET /preview', () => {
  it('switches draft mode on for the signed-in owner and sends them to the Page', async () => {
    auth.mockResolvedValue({ user: { id: 'owner' } });

    await expect(GET(request('?path=%2Fuses'))).rejects.toThrow('REDIRECT /uses');
    expect(enable).toHaveBeenCalledTimes(1);
  });

  it('refuses a visitor who is not signed in', async () => {
    auth.mockResolvedValue({ user: null });

    const response = await GET(request('?path=%2Fuses'));

    expect(response.status).toBe(403);
  });

  /** A visitor must not be left in draft mode by a cookie from an earlier sign-in. */
  it('switches draft mode off for a visitor who is not signed in', async () => {
    auth.mockResolvedValue({ user: null });

    await GET(request('?path=%2Fuses'));

    expect(disable).toHaveBeenCalledTimes(1);
    expect(enable).not.toHaveBeenCalled();
  });

  it('refuses when the sign-in cannot be checked', async () => {
    auth.mockRejectedValue(new Error('the token is malformed'));

    const response = await GET(request('?path=%2Fuses'));

    expect(response.status).toBe(403);
    expect(enable).not.toHaveBeenCalled();
  });

  /** Otherwise the link would bounce a signed-in owner to any site. */
  it('refuses to send anyone to another site', async () => {
    auth.mockResolvedValue({ user: { id: 'owner' } });

    const response = await GET(request('?path=https%3A%2F%2Fexample.com'));

    expect(response.status).toBe(400);
    expect(enable).not.toHaveBeenCalled();
  });

  it('refuses a request that names no Page', async () => {
    const response = await GET(request(''));

    expect(response.status).toBe(400);
  });
});
