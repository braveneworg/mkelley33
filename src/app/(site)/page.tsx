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
import { listServices } from '@/lib/repositories/services';
import { getSiteSettings } from '@/lib/repositories/site-settings';

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
  const [allPosts, services, { name, repoUrl, tagline }] = await Promise.all([
    listPublishedPosts(),
    listServices(),
    getSiteSettings(),
  ]);
  const posts = allPosts.slice(0, 3);
  return (
    <>
      <Hero name={name} tagline={tagline} />
      <AboutBeat name={name} />
      <AiToolboxBeat />
      <ServicesBeat services={services} />
      <CareerBeat />
      <OpenSourceBeat repoUrl={repoUrl} />
      <LatestPostsBeat posts={posts} />
      <NewsletterBeat />
    </>
  );
}
