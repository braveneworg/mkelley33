/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Maps a list one item at a time, each finished before the next starts.
 * The fill uploads in the order a Page shows its pictures, and Capture
 * reports what it left out in the order the Page holds it — neither holds
 * when the items race.
 */
export const inOrder = async <Item, Mapped>(
  items: readonly Item[],
  map: (item: Item) => Promise<Mapped>
): Promise<Mapped[]> => {
  const mapped: Mapped[] = [];
  for (const item of items) {
    mapped.push(await map(item));
  }
  return mapped;
};
