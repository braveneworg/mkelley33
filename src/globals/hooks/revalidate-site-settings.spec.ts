/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { revalidateSiteSettings } from '@/globals/hooks/revalidate-site-settings';

const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

beforeEach(() => {
  revalidatePath.mockClear();
});

describe('revalidateSiteSettings', () => {
  /**
   * The header, the footer and the metadata come from Site settings, so a
   * publish reaches every page: the root layout, and everything under it.
   */
  it('revalidates the whole site when the settings are published', async () => {
    await revalidateSiteSettings({ doc: { _status: 'published' } } as never);

    expect(revalidatePath.mock.calls).toEqual([['/', 'layout']]);
  });

  /** Visitors never see a draft, so saving one changes nothing they are served. */
  it('revalidates nothing when a draft is saved', async () => {
    await revalidateSiteSettings({ doc: { _status: 'draft' } } as never);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the document it was given', async () => {
    const doc = { _status: 'published' };

    await expect(revalidateSiteSettings({ doc } as never)).resolves.toBe(doc);
  });
});
