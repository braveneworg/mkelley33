import { AboutBeat } from '@/components/home/about-beat';
import { AiToolboxBeat } from '@/components/home/ai-toolbox-beat';
import { CareerBeat } from '@/components/home/career-beat';
import { Hero } from '@/components/home/hero';
import { LatestPostsBeat } from '@/components/home/latest-posts-beat';
import { OpenSourceBeat } from '@/components/home/open-source-beat';
import { ServicesBeat } from '@/components/home/services-beat';
import { listPublishedPosts } from '@/lib/repositories/posts';

export const revalidate = 300;

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
    </>
  );
}
