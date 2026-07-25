export interface SiteConfig {
  description: string;
  handle: string;
  name: string;
  /** Public repo for the "open source on GitHub" links — owner supplies later. */
  repoUrl: string | null;
  socials: {
    /** Owner supplies later; footer hides the link while null. */
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
  name: 'Michaux Kelley',
  repoUrl: null,
  socials: {
    bluesky: null,
    github: 'https://github.com/mkelley33',
    linkedin: 'https://www.linkedin.com/in/mkelley33',
  },
  tagline: 'Full-stack engineering, AI at the terminal.',
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  url: 'https://mkelley33.com',
};
