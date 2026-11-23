/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { draftMode } from 'next/headers';

/**
 * True while the owner is previewing drafts. Draft mode is switched on only
 * by the preview route, after it has checked who is asking, so everything
 * that reads a draft asks here first.
 *
 * Outside a request there is nothing to ask — the Seed and the integration
 * specs read the same repositories — and the answer is no.
 */
export const isPreviewing = async (): Promise<boolean> => {
  try {
    const { isEnabled } = await draftMode();
    return isEnabled;
  } catch {
    return false;
  }
};

/**
 * The path a preview may send the owner on to, or null when it is not one
 * on this site. Without this check a preview link would be an open
 * redirect: `/preview?path=https://…` would bounce a signed-in owner
 * anywhere.
 */
export const safePreviewPath = (path: null | string): null | string =>
  path !== null && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
    ? path
    : null;
