/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { AboutBeat } from '@/components/home/about-beat';
import { AiToolboxBeat } from '@/components/home/ai-toolbox-beat';
import { CareerBeat } from '@/components/home/career-beat';
import { Hero } from '@/components/home/hero';
import { LatestPostsBeat } from '@/components/home/latest-posts-beat';
import { NewsletterBeat } from '@/components/home/newsletter-beat';
import { OpenSourceBeat } from '@/components/home/open-source-beat';
import { ServicesBeat } from '@/components/home/services-beat';
import { feedAlternateTypes } from '@/lib/feed-alternates';
import { listPublishedPosts } from '@/lib/repositories/posts';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: {
    // The root route's internal pathname is '/index', so the layout's
    // relative './' canonical would resolve to /index here — pin it.
    canonical: '/',
    types: feedAlternateTypes,
  },
};

export default async function HomePage() {
  const posts = (await listPublishedPosts()).slice(0, 3);
  return (
    <>
      <Hero />
      <AboutBeat />
      <AiToolboxBeat />
      <ServicesBeat />
      <CareerBeat />
      <OpenSourceBeat />
      <LatestPostsBeat posts={posts} />
      <NewsletterBeat />
    </>
  );
}
