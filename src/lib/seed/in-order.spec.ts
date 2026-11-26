/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { inOrder } from '@/lib/seed/in-order';

describe('inOrder', () => {
  it('hands back what each item was mapped to, in the order of the items', async () => {
    await expect(inOrder([1, 2, 3], (item) => Promise.resolve(item * 2))).resolves.toEqual([
      2, 4, 6,
    ]);
  });

  /** The first item is the slowest; it still finishes before the second starts. */
  it('finishes one item before it starts the next', async () => {
    const log: string[] = [];

    await inOrder([2, 1, 0], async (ticks) => {
      log.push(`start ${ticks}`);
      for (let tick = 0; tick < ticks; tick += 1) {
        await Promise.resolve();
      }
      log.push(`end ${ticks}`);
    });

    expect(log).toEqual(['start 2', 'end 2', 'start 1', 'end 1', 'start 0', 'end 0']);
  });

  it('maps nothing for an empty list', async () => {
    await expect(inOrder([], () => Promise.resolve('never'))).resolves.toEqual([]);
  });
});
