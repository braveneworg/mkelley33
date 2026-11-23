/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { draftMode } from 'next/headers';

import { isFixedPage } from '@/lib/pages/page-address';
import { getFixedPage, getPage, getPageDraft } from '@/lib/repositories/pages';
import type { Page } from '@/payload-types';

import type { Metadata } from 'next';

/**
 * The Page a route should render at `slug`, or null for a 404.
 *
 * A visitor gets the published Page; a missing Fixed Page throws instead,
 * so a build without one fails (docs/adr/0001). The owner, previewing in
 * draft mode, gets the newest saved state. Draft mode is only ever switched
 * on by the preview route, after it has checked who is asking.
 */
export const loadPage = async (slug: string): Promise<null | Page> => {
  const { isEnabled } = await draftMode();
  if (isEnabled) {
    return getPageDraft(slug);
  }
  return isFixedPage(slug) ? getFixedPage(slug) : getPage(slug);
};

/**
 * What a Page contributes to its own `<head>`. The layout supplies the rest:
 * the title template, the canonical, the share card.
 */
export const pageMetadata = ({ meta, title }: Page): Metadata => ({
  ...(meta?.description ? { description: meta.description } : {}),
  title: meta?.title || title,
});
