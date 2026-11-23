/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { cache } from 'react';

import { getPayload } from 'payload';

import config from '@payload-config';

import { findPageDraft, findPublishedPage } from '@/collections/published-page';
import { isFixedPage, pageHref } from '@/lib/pages/page-address';
import type { Page } from '@/payload-types';

/** A published Page as the menus, the command palette and the sitemap list it. */
export interface PageSummary {
  /** The address visitors use. */
  href: string;
  slug: string;
  title: string;
  updatedAt: string;
}

/**
 * The Page visitors are served at `slug`, or null when none is published
 * there. Drafts never reach a rendered page, and unpublishing a Fixed Page
 * does not remove it — see `findPublishedPage`.
 *
 * Nothing here falls back to source (docs/adr/0001), and a database failure
 * is not caught: at build time that fails the build and leaves the current
 * site up, and during revalidation Next keeps serving the last page it built.
 */
export const getPage = cache(async (slug: string): Promise<null | Page> => {
  const payload = await getPayload({ config });
  return findPublishedPage(payload, slug);
});

/**
 * A Fixed Page, which the site cannot do without: a missing one throws
 * instead of rendering a 404, so a build against a database that lacks it
 * fails.
 */
export const getFixedPage = async (slug: string): Promise<Page> => {
  const page = await getPage(slug);
  if (page === null) {
    throw new Error(
      `The ${slug} Page is not published. An empty database is filled with \`pnpm seed\`; ` +
        'otherwise publish it in the admin.'
    );
  }
  return page;
};

/**
 * The newest saved state of the Page at `slug`, published or not. Only the
 * owner's preview may show this; a route must check draft mode before
 * calling it.
 */
export const getPageDraft = cache(async (slug: string): Promise<null | Page> => {
  const payload = await getPayload({ config });
  return findPageDraft(payload, slug);
});

const summarize = ({ slug, title, updatedAt }: Page): PageSummary => ({
  href: pageHref(slug),
  slug,
  title,
  updatedAt,
});

/**
 * Every Page visitors can reach, without its Blocks. An unpublished Fixed
 * Page is still served, so it is listed, by its last published version.
 */
export const listPublishedPages = cache(async (): Promise<PageSummary[]> => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: false,
    overrideAccess: true,
    pagination: false,
    sort: 'slug',
  });
  const served = await Promise.all(
    docs.map(async (page) => {
      if (page._status === 'published') {
        return page;
      }
      return isFixedPage(page.slug) ? findPublishedPage(payload, page.slug) : null;
    })
  );
  return served.flatMap((page) => (page === null ? [] : [summarize(page)]));
});
