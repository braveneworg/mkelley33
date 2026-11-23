/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { ChipListBlock } from '@/collections/page-blocks/chip-list';
import { ContactFormBlock } from '@/collections/page-blocks/contact-form';
import { CvEntriesBlock } from '@/collections/page-blocks/cv-entries';
import { CvExperienceBlock } from '@/collections/page-blocks/cv-experience';
import { CvSkillsBlock } from '@/collections/page-blocks/cv-skills';
import { CvSummaryBlock } from '@/collections/page-blocks/cv-summary';
import { DefinitionListBlock } from '@/collections/page-blocks/definition-list';
import { HeroBlock } from '@/collections/page-blocks/hero';
import { LatestPostsBlock } from '@/collections/page-blocks/latest-posts';
import { LinkListBlock } from '@/collections/page-blocks/link-list';
import { NewsletterSignupBlock } from '@/collections/page-blocks/newsletter-signup';
import { PictureBlock } from '@/collections/page-blocks/picture';
import { PostListBlock } from '@/collections/page-blocks/post-list';
import { ResumeDownloadBlock } from '@/collections/page-blocks/resume-download';
import { ServicesDetailBlock } from '@/collections/page-blocks/services-detail';
import { ServicesGridBlock } from '@/collections/page-blocks/services-grid';
import { TerminalBlock } from '@/collections/page-blocks/terminal';
import { TimelineBlock } from '@/collections/page-blocks/timeline';

import type { Block } from 'payload';

/**
 * Every kind of Block a Page can hold, in the order the admin offers them.
 * This is the config half of the registry. The other half is the component
 * that renders each kind, in `src/components/blocks/render-blocks.tsx`, whose
 * type requires exactly one component per kind listed here — so a kind
 * cannot be offered in the admin without a way to show it, or the reverse.
 *
 * A new kind is a code change (see `CONTEXT.md`): a definition here, a
 * component there, and regenerated types.
 */
export const PAGE_BLOCKS: readonly Block[] = [
  HeroBlock,
  TerminalBlock,
  ChipListBlock,
  TimelineBlock,
  LinkListBlock,
  DefinitionListBlock,
  ServicesGridBlock,
  ServicesDetailBlock,
  LatestPostsBlock,
  PostListBlock,
  NewsletterSignupBlock,
  ContactFormBlock,
  PictureBlock,
  CvSummaryBlock,
  CvSkillsBlock,
  CvExperienceBlock,
  CvEntriesBlock,
  ResumeDownloadBlock,
];
