/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

/**
 * A Page shows up in more places than its own address — the menus, the
 * command palette and the sitemap all list published Pages — so a change
 * visitors can see revalidates the whole site from the root layout down.
 * The site is a handful of Pages; one rule that is always right beats a
 * list of addresses that has to be kept complete.
 */
const revalidateSite = async (): Promise<void> => {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
  } catch {
    // Outside the Next.js runtime (the Seed, integration specs) — no-op.
  }
};

/**
 * Saving a draft of a Page that is not published changes nothing a visitor
 * sees, so it revalidates nothing. Publishing does, and so does unpublishing
 * — which is a save whose previous state was published.
 */
export const revalidatePageAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
}) => {
  if (doc._status === 'published' || previousDoc?._status === 'published') {
    await revalidateSite();
  }
  return doc;
};

export const revalidatePageAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidateSite();
  return doc;
};
