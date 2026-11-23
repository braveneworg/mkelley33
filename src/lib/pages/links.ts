/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { isFixedPage, pageHref } from '@/lib/pages/page-address';
import type { Page } from '@/payload-types';

/** What a link needs to know about the Page it points at. */
export type LinkedPage = Pick<Page, '_status' | 'slug'>;

/** A link as the admin stores it — see `linkGroup` in the Block field helpers. */
export interface LinkFields {
  label?: null | string;
  /** The Page as a read resolved it, or its bare id when it could not be. */
  page?: LinkedPage | null | string;
  url?: null | string;
}

export interface ResolvedLink {
  /** An address on another site: it opens in a new tab. */
  external: boolean;
  href: string;
  label: string;
}

/** A Fixed Page is served even when unpublished, so a link to it holds. */
const isServed = ({ _status, slug }: LinkedPage): boolean =>
  _status === 'published' || isFixedPage(slug);

/**
 * Turns a stored link into something to render, or null when there is
 * nothing to show: no label, no target, or a Page that is unpublished or
 * deleted. A hidden link is the owner's decision (2026-11-23) — the item
 * stays in the admin and returns when the Page is published again.
 */
export const resolveLink = (link: LinkFields | null | undefined): null | ResolvedLink => {
  const label = link?.label;
  if (!link || !label) {
    return null;
  }
  const { page, url } = link;
  // An id rather than a document means the Page could not be resolved.
  if (typeof page === 'object' && page !== null) {
    return isServed(page) ? { external: false, href: pageHref(page.slug), label } : null;
  }
  return url ? { external: true, href: url, label } : null;
};
