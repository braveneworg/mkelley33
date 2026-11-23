/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { GlobalAfterChangeHook } from 'payload';

/**
 * Publishing Site settings shows on every page at once — the footer, the
 * command palette and the metadata all read them — so the whole site is revalidated
 * from the root layout down. Saving a draft revalidates nothing: visitors are
 * never served one.
 */
export const revalidateSiteSettings: GlobalAfterChangeHook = async ({ doc }) => {
  if (doc._status !== 'published') {
    return doc;
  }
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
  } catch {
    // Outside the Next.js runtime (the Seed, integration specs) — no-op.
  }
  return doc;
};
