/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { notFound } from 'next/navigation';

import { PageView } from '@/components/blocks/page-view';
import { loadPage, pageMetadata } from '@/lib/pages/load-page';
import { HOME_SLUG } from '@/lib/pages/page-address';
import { listPublishedPages } from '@/lib/repositories/pages';
import type { Page } from '@/payload-types';

import type { Metadata } from 'next';

export const revalidate = 300;

interface PageRouteProps {
  params: Promise<{ slug: string }>;
}

/**
 * Every published Page is built ahead of time. A Page the owner publishes
 * later is rendered on its first visit and kept from then on.
 */
export const generateStaticParams = async (): Promise<{ slug: string }[]> =>
  (await listPublishedPages())
    .filter(({ slug }) => slug !== HOME_SLUG)
    .map(({ slug }) => ({ slug }));

/** The home Page lives at the root; `/home` is not a second address for it. */
const loadPageAt = async (slug: string): Promise<null | Page> =>
  slug === HOME_SLUG ? null : loadPage(slug);

export const generateMetadata = async ({ params }: PageRouteProps): Promise<Metadata> => {
  const { slug } = await params;
  const page = await loadPageAt(slug);
  return page === null ? {} : pageMetadata(page);
};

/**
 * Any Page one level deep. The routes that stay in code have files of their
 * own and win over this one, which is why a Page cannot be given one of
 * their names (`RESERVED_PAGE_SLUGS`).
 */
export default async function PageRoute({ params }: PageRouteProps) {
  const { slug } = await params;
  const page = await loadPageAt(slug);
  if (page === null) {
    notFound();
  }
  return <PageView page={page} />;
}
