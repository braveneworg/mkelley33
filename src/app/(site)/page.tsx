/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { notFound } from 'next/navigation';

import { PageView } from '@/components/blocks/page-view';
import { feedAlternateTypes } from '@/lib/feed-alternates';
import { loadPage } from '@/lib/pages/load-page';
import { HOME_SLUG } from '@/lib/pages/page-address';

import type { Metadata } from 'next';

export const revalidate = 300;

/**
 * The home Page keeps the site's own browser title unless the owner gave
 * it a search title of its own: "home" is its name in the admin, not what
 * a search result should say.
 */
export const generateMetadata = async (): Promise<Metadata> => {
  const page = await loadPage(HOME_SLUG);
  return {
    alternates: {
      // The root route's internal pathname is '/index', so the layout's
      // relative './' canonical would resolve to /index here — pin it.
      canonical: '/',
      types: feedAlternateTypes,
    },
    ...(page?.meta?.description ? { description: page.meta.description } : {}),
    ...(page?.meta?.title ? { title: page.meta.title } : {}),
  };
};

/**
 * The home Page, from the database. It is a Fixed Page, so for a visitor a
 * missing one fails the build rather than rendering (docs/adr/0001); only
 * the owner's preview can find nothing here.
 */
export default async function HomePage() {
  const page = await loadPage(HOME_SLUG);
  if (page === null) {
    notFound();
  }
  return <PageView page={page} />;
}
