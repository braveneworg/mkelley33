/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { GET } from '@/app/(site)/preview/exit/route';

const disable = vi.fn();

vi.mock('next/headers', () => ({ draftMode: async () => ({ disable }) }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));

const request = (query: string): Request =>
  new Request(`https://mkelley33.com/preview/exit${query}`);

beforeEach(() => {
  disable.mockReset();
});

describe('GET /preview/exit', () => {
  it('switches draft mode off and returns to the page the owner was on', async () => {
    await expect(GET(request('?path=%2Fuses'))).rejects.toThrow('REDIRECT /uses');
    expect(disable).toHaveBeenCalledTimes(1);
  });

  it('returns to the home page when told nowhere', async () => {
    await expect(GET(request(''))).rejects.toThrow('REDIRECT /');
  });

  it('returns to the home page rather than to another site', async () => {
    await expect(GET(request('?path=https%3A%2F%2Fexample.com'))).rejects.toThrow('REDIRECT /');
  });
});
