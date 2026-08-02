/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  revalidateCommentAfterChange,
  revalidateCommentAfterDelete,
} from '@/collections/hooks/revalidate-comment';

const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));

const paths = (): string[] => revalidatePath.mock.calls.map((call) => String(call[0]));

const findByID = vi.fn();

const req = { payload: { findByID } };

beforeEach(() => {
  revalidatePath.mockClear();
  findByID.mockReset();
});

describe('revalidateCommentAfterChange', () => {
  it('revalidates the post page when the post is populated', async () => {
    const doc = { id: 'c1', post: { id: 'p1', slug: 'hello-world' } };

    const returned = await revalidateCommentAfterChange({ doc, req } as never);

    expect(paths()).toEqual(['/blog/hello-world']);
    expect(returned).toBe(doc);
  });

  it('resolves the slug when the post is an id string', async () => {
    findByID.mockResolvedValue({ id: 'p1', slug: 'from-lookup' });

    await revalidateCommentAfterChange({ doc: { id: 'c1', post: 'p1' }, req } as never);

    expect(paths()).toEqual(['/blog/from-lookup']);
  });

  it('swallows a failed post lookup', async () => {
    findByID.mockRejectedValue(new Error('down'));

    const doc = { id: 'c1', post: 'p1' };

    await expect(revalidateCommentAfterChange({ doc, req } as never)).resolves.toBe(doc);
    expect(paths()).toEqual([]);
  });
});

describe('revalidateCommentAfterDelete', () => {
  it('revalidates the post page for the deleted comment', async () => {
    const doc = { id: 'c1', post: { id: 'p1', slug: 'goodbye' } };

    const returned = await revalidateCommentAfterDelete({ doc, req } as never);

    expect(paths()).toEqual(['/blog/goodbye']);
    expect(returned).toBe(doc);
  });
});
