/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Site settings as the site renders them. The record lives in the database
 * and nowhere else (docs/adr/0001); `getSiteSettings` in
 * `@/lib/repositories/site-settings` reads it. The type sits here, apart from
 * the repository, so a Client Component can name it without importing one.
 *
 * A link that is `null` is one the owner cleared, and the site hides it.
 */
import type { ResolvedLink } from '@/lib/pages/links';

export interface SiteSettingsContent {
  description: string;
  /**
   * The extra links at the bottom of every page, already resolved. The
   * footer adds the social, RSS and privacy links by itself.
   */
  footerMenu: ResolvedLink[];
  /**
   * The links at the top of every page, already resolved: an item whose
   * Page is unpublished or deleted is not in this list.
   */
  headerMenu: ResolvedLink[];
  name: string;
  repoUrl: null | string;
  /**
   * Where storage serves the current Resume upload, or `null` when the slot
   * is empty. Visitors are never sent here: `/michaux-kelley-resume.pdf`
   * serves whatever this points at.
   */
  resumeUrl: null | string;
  socials: {
    bluesky: null | string;
    github: string;
    linkedin: string;
  };
  tagline: string;
  title: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

/**
 * The owner's profiles in the order the site shows them, without the ones
 * the owner cleared. The footer, the command palette and the Person JSON-LD
 * all list the same profiles, so they all start here.
 */
export const listSocialLinks = ({
  bluesky,
  github,
  linkedin,
}: SiteSettingsContent['socials']): SocialLink[] => [
  { label: 'github', url: github },
  { label: 'linkedin', url: linkedin },
  ...(bluesky === null ? [] : [{ label: 'bluesky', url: bluesky }]),
];
