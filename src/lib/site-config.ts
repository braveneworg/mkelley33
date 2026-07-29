/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export interface SiteConfig {
  description: string;
  handle: string;
  /** Path under /public to the headshot image; null until the owner supplies it. */
  headshot: string | null;
  name: string;
  /** Public repo for the "open source on GitHub" links — owner supplies later. */
  repoUrl: string | null;
  /** Path under /public to the resume PDF; null hides the CV download button. */
  resumePdf: string | null;
  socials: {
    /** null hides it from the footer, the command palette, and JSON-LD sameAs. */
    bluesky: string | null;
    github: string;
    linkedin: string;
  };
  tagline: string;
  title: string;
  url: string;
}

export const siteConfig: SiteConfig = {
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
  handle: 'mkelley33',
  headshot: '/headshot.webp',
  name: 'Michaux Kelley',
  repoUrl: 'https://github.com/braveneworg/mkelley33',
  resumePdf: '/michaux-kelley-resume.pdf',
  socials: {
    bluesky: 'https://bsky.app/profile/mkelley33.com',
    github: 'https://github.com/mkelley33',
    linkedin: 'https://www.linkedin.com/in/mkelley33',
  },
  tagline: 'Full-stack engineering, AI at the terminal.',
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  url: 'https://mkelley33.com',
};
