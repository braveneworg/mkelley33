/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { isPreviewing, safePreviewPath } from '@/lib/pages/preview';

const draftMode = vi.fn();

vi.mock('next/headers', () => ({ draftMode: () => draftMode() }));

describe('isPreviewing', () => {
  it('is true while draft mode is on', async () => {
    draftMode.mockResolvedValue({ isEnabled: true });

    await expect(isPreviewing()).resolves.toBe(true);
  });

  it('is false for a visitor', async () => {
    draftMode.mockResolvedValue({ isEnabled: false });

    await expect(isPreviewing()).resolves.toBe(false);
  });

  /** The Seed and the specs read the same repositories with no request at all. */
  it('is false where there is no request to ask', async () => {
    draftMode.mockRejectedValue(new Error('`draftMode` was called outside a request scope'));

    await expect(isPreviewing()).resolves.toBe(false);
  });
});

describe('safePreviewPath', () => {
  it.each(['/', '/uses', '/blog/a-post'])('accepts %s', (path) => {
    expect(safePreviewPath(path)).toBe(path);
  });

  /** A preview link must never be a way to send the owner to another site. */
  it.each([
    ['another site', 'https://example.com/'],
    ['a protocol-relative address', '//example.com/'],
    ['a backslash some browsers read as a slash', '/\\example.com'],
    ['a path that is not absolute', 'uses'],
    ['nothing', null],
    ['an empty path', ''],
  ])('refuses %s', (_label, path) => {
    expect(safePreviewPath(path)).toBeNull();
  });
});
