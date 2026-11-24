/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { isFixedPage } from '@/lib/pages/page-address';
import type { Page } from '@/payload-types';

import type { Payload } from 'payload';

const PAGES = 'pages';

/** Deep enough to resolve a Block's picture and the Page a link points at. */
const DEPTH = 1;

/**
 * What visitors are served for the record `current`, or null when it is
 * nothing: the record itself while it is published, and otherwise — for a
 * Fixed Page only — the last version of it that was.
 */
const servedVersion = async (
  payload: Payload,
  current: Page,
  depth: number
): Promise<null | Page> => {
  if (current._status === 'published') {
    return current;
  }
  if (!isFixedPage(current.slug)) {
    return null;
  }
  const versions = await payload.findVersions({
    collection: PAGES,
    depth,
    limit: 1,
    overrideAccess: true,
    sort: '-updatedAt',
    where: {
      and: [{ parent: { equals: current.id } }, { 'version._status': { equals: 'published' } }],
    },
  });
  const published = versions.docs[0]?.version;
  return published === undefined ? null : { ...published, id: current.id };
};

/**
 * The Page visitors are served at `slug`, or null when there is none.
 *
 * Normally that is the record itself. A Fixed Page is the exception: the
 * admin lets the owner unpublish it, and the site cannot do without it, so
 * unpublishing does not take it away — the last version that was published
 * stays in force until the owner publishes again (owner's decision,
 * 2026-11-23; Site settings behave the same way). Drafts, and edits saved
 * while unpublished, are never returned.
 *
 * It reads with the owner's access, because version history is not public.
 * What it hands back is published content only, so its callers may show it
 * to anyone.
 */
export const findPublishedPage = async (payload: Payload, slug: string): Promise<null | Page> => {
  const { docs } = await payload.find({
    collection: PAGES,
    depth: DEPTH,
    draft: false,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } },
  });
  const current = docs[0];
  return current === undefined ? null : servedVersion(payload, current, DEPTH);
};

/**
 * Every Page visitors are served, in the order of their addresses: the
 * published ones, and each unpublished Fixed Page as it was last published.
 * The menus, the sitemap and Capture all go by this list.
 */
export const findPublishedPages = async (payload: Payload, depth = 0): Promise<Page[]> => {
  const { docs } = await payload.find({
    collection: PAGES,
    depth,
    draft: false,
    overrideAccess: true,
    pagination: false,
    sort: 'slug',
  });
  const served = await Promise.all(docs.map((page) => servedVersion(payload, page, depth)));
  return served.flatMap((page) => (page === null ? [] : [page]));
};

/**
 * The newest saved state of the Page at `slug`, published or not — what the
 * owner previews. Never serve this to a visitor.
 */
export const findPageDraft = async (payload: Payload, slug: string): Promise<null | Page> => {
  const { docs } = await payload.find({
    collection: PAGES,
    depth: DEPTH,
    draft: true,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: slug } },
  });
  return docs[0] ?? null;
};
