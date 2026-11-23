/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  revalidatePageAfterChange,
  revalidatePageAfterDelete,
} from '@/collections/hooks/revalidate-page';

const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

beforeEach(() => {
  revalidatePath.mockClear();
});

describe('revalidatePageAfterChange', () => {
  /**
   * The menus, the command palette and the sitemap list published Pages, so
   * a publish reaches more than the Page's own address.
   */
  it('revalidates the whole site when a Page is published', async () => {
    await revalidatePageAfterChange({ doc: { _status: 'published' } } as never);

    expect(revalidatePath.mock.calls).toEqual([['/', 'layout']]);
  });

  it('revalidates the whole site when a Page is unpublished', async () => {
    await revalidatePageAfterChange({
      doc: { _status: 'draft' },
      previousDoc: { _status: 'published' },
    } as never);

    expect(revalidatePath.mock.calls).toEqual([['/', 'layout']]);
  });

  /** Visitors never see a draft, so saving one changes nothing they are served. */
  it('revalidates nothing when a draft of an unpublished Page is saved', async () => {
    await revalidatePageAfterChange({
      doc: { _status: 'draft' },
      previousDoc: { _status: 'draft' },
    } as never);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns the document it was given', async () => {
    const doc = { _status: 'published' };

    await expect(revalidatePageAfterChange({ doc } as never)).resolves.toBe(doc);
  });
});

describe('revalidatePageAfterDelete', () => {
  it('revalidates the whole site', async () => {
    await revalidatePageAfterDelete({ doc: {} } as never);

    expect(revalidatePath.mock.calls).toEqual([['/', 'layout']]);
  });

  it('returns the document it was given', async () => {
    const doc = { slug: 'uses' };

    await expect(revalidatePageAfterDelete({ doc } as never)).resolves.toBe(doc);
  });
});
