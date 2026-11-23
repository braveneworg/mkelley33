/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { AllPosts } from '@/components/blocks/all-posts';
import { ChipList } from '@/components/blocks/chip-list';
import { Contact } from '@/components/blocks/contact';
import { CookieInventory } from '@/components/blocks/cookie-inventory';
import { CvEntries } from '@/components/blocks/cv-entries';
import { CvExperience } from '@/components/blocks/cv-experience';
import { CvSkills } from '@/components/blocks/cv-skills';
import { CvSummary } from '@/components/blocks/cv-summary';
import { DefinitionList } from '@/components/blocks/definition-list';
import { Hero } from '@/components/blocks/hero';
import { LatestPosts } from '@/components/blocks/latest-posts';
import { LinkList } from '@/components/blocks/link-list';
import { ManagePreferences } from '@/components/blocks/manage-preferences';
import { NewsletterSignup } from '@/components/blocks/newsletter-signup';
import { Picture } from '@/components/blocks/picture';
import { ResumeDownload } from '@/components/blocks/resume-download';
import { ServicesDetail } from '@/components/blocks/services-detail';
import { ServicesGrid } from '@/components/blocks/services-grid';
import { Terminal } from '@/components/blocks/terminal';
import { Timeline } from '@/components/blocks/timeline';
import type { Page } from '@/payload-types';

export type PageBlock = NonNullable<Page['blocks']>[number];

type NothingToTypeBlock = Extract<
  PageBlock,
  { blockType: 'cookieInventory' | 'managePreferences' | 'resumeDownload' }
>;

/** The kinds with nothing to type: what each shows is decided elsewhere. */
const NothingToTypeBlockView = ({ block }: { block: NothingToTypeBlock }) => {
  switch (block.blockType) {
    case 'cookieInventory':
      return <CookieInventory />;
    case 'managePreferences':
      return <ManagePreferences />;
    case 'resumeDownload':
      return <ResumeDownload />;
    default: {
      const unhandled: never = block;
      return unhandled;
    }
  }
};

type TypedInBlock = Extract<
  PageBlock,
  {
    blockType:
      | 'chipList'
      | 'cvEntries'
      | 'cvExperience'
      | 'cvSkills'
      | 'cvSummary'
      | 'definitionList'
      | 'linkList'
      | 'terminal'
      | 'timeline';
  }
>;

/** The kinds that show only what the owner typed into them. */
const TypedInBlockView = ({ block }: { block: NothingToTypeBlock | TypedInBlock }) => {
  switch (block.blockType) {
    case 'chipList':
      return <ChipList block={block} />;
    case 'cvEntries':
      return <CvEntries block={block} />;
    case 'cvExperience':
      return <CvExperience block={block} />;
    case 'cvSkills':
      return <CvSkills block={block} />;
    case 'cvSummary':
      return <CvSummary block={block} />;
    case 'definitionList':
      return <DefinitionList block={block} />;
    case 'linkList':
      return <LinkList block={block} />;
    case 'terminal':
      return <Terminal block={block} />;
    case 'timeline':
      return <Timeline block={block} />;
    default:
      return <NothingToTypeBlockView block={block} />;
  }
};

/**
 * The renderer half of the Block registry: one component for each kind in
 * `PAGE_BLOCKS`. The three `switch`es are the guarantee. `PageBlock` is
 * generated from the config, so a kind added there without a case here
 * reaches the last `default` un-narrowed and fails the type-check at
 * `unhandled`, and a case for a kind that is not in the config does not
 * compile either.
 *
 * There are three only because one would be too long to read. This one
 * takes the kinds that draw on something outside themselves — Site
 * settings, the Services, the Posts, the Media library, a form — and hands
 * the rest on: first the kinds the owner types into, then the ones with
 * nothing to type.
 */
const BlockView = ({ block, isFirst }: { block: PageBlock; isFirst: boolean }) => {
  switch (block.blockType) {
    case 'contactForm':
      return <Contact block={block} />;
    case 'hero':
      return <Hero block={block} isPageHeading={isFirst} />;
    case 'latestPosts':
      return <LatestPosts block={block} />;
    case 'newsletterSignup':
      return <NewsletterSignup block={block} />;
    case 'picture':
      return <Picture block={block} />;
    case 'postList':
      return <AllPosts block={block} />;
    case 'servicesDetail':
      return <ServicesDetail block={block} />;
    case 'servicesGrid':
      return <ServicesGrid block={block} />;
    default:
      return <TypedInBlockView block={block} />;
  }
};

/** A Page's Blocks, in the order the owner arranged them. */
export const RenderBlocks = ({ blocks }: { blocks: readonly PageBlock[] }) => (
  <>
    {blocks.map((block, index) => (
      <BlockView
        block={block}
        isFirst={index === 0}
        key={block.id ?? `${block.blockType}-${String(index)}`}
      />
    ))}
  </>
);
