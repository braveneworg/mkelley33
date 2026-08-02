/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { E2E_POST_SLUG, seedE2ePost } from '@/lib/e2e/post-seed';

import type { Payload } from 'payload';

const find = vi.fn();
const create = vi.fn();

const payload = { create, find } as unknown as Payload;

beforeEach(() => {
  find.mockReset();
  create.mockReset();
});

describe('seedE2ePost', () => {
  it('creates the published post when the slug is absent', async () => {
    find.mockResolvedValue({ docs: [] });

    await expect(seedE2ePost(payload)).resolves.toEqual({ created: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        data: expect.objectContaining({ slug: E2E_POST_SLUG, status: 'published' }),
      })
    );
  });

  it('is a no-op when the post already exists', async () => {
    find.mockResolvedValue({ docs: [{ id: 'p1', slug: E2E_POST_SLUG }] });

    await expect(seedE2ePost(payload)).resolves.toEqual({ created: false });
    expect(create).not.toHaveBeenCalled();
  });
});
