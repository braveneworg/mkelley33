/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import type * as siteSettingsRepo from '@/lib/repositories/site-settings';

const findPublished = vi.fn();
const payload = { marker: 'the payload instance' };

vi.mock('payload', () => ({ getPayload: vi.fn(async () => payload) }));
vi.mock('@/globals/published-site-settings', () => ({
  findPublishedSiteSettings: (...args: unknown[]) => findPublished(...args),
}));
vi.mock('@payload-config', () => ({ default: {} }));

/** `getSiteSettings` is wrapped in React's `cache`; a fresh registry per test undoes it. */
const importFresh = async (): Promise<typeof siteSettingsRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/site-settings');
};

const published = {
  description: 'a description',
  name: 'Owner Name',
  repoUrl: 'https://example.com/repo',
  resume: { filename: 'resume.pdf', url: '/api/resume-files/file/resume.pdf' },
  socials: {
    bluesky: 'https://example.com/bluesky',
    github: 'https://example.com/github',
    linkedin: 'https://example.com/linkedin',
  },
  tagline: 'a tagline',
  title: 'a browser title',
};

beforeEach(() => {
  findPublished.mockReset();
});

describe('getSiteSettings', () => {
  it('returns the published settings', async () => {
    findPublished.mockResolvedValue(published);
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toEqual({
      description: 'a description',
      name: 'Owner Name',
      repoUrl: 'https://example.com/repo',
      resumeUrl: '/api/resume-files/file/resume.pdf',
      socials: {
        bluesky: 'https://example.com/bluesky',
        github: 'https://example.com/github',
        linkedin: 'https://example.com/linkedin',
      },
      tagline: 'a tagline',
      title: 'a browser title',
    });
  });

  /** Depth 1 is what turns the Resume from an id into a file with an address. */
  it('asks for the published settings with the Resume resolved', async () => {
    findPublished.mockResolvedValue(published);
    const { getSiteSettings } = await importFresh();

    await getSiteSettings();

    expect(findPublished).toHaveBeenCalledWith(payload, 1);
  });

  /** An empty optional link comes back from the CMS as '' or undefined; the site hides both. */
  it.each([undefined, null, ''])(
    'reports an empty repository link (%s) as null',
    async (repoUrl) => {
      findPublished.mockResolvedValue({ ...published, repoUrl });
      const { getSiteSettings } = await importFresh();

      await expect(getSiteSettings()).resolves.toMatchObject({ repoUrl: null });
    }
  );

  it.each([undefined, null, ''])('reports an empty bluesky link (%s) as null', async (bluesky) => {
    findPublished.mockResolvedValue({ ...published, socials: { ...published.socials, bluesky } });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({ socials: { bluesky: null } });
  });

  /** No Resume, or one whose file is gone: the site hides the download either way. */
  it.each([undefined, null, 'an-unpopulated-id', { filename: 'resume.pdf', url: null }])(
    'reports a missing Resume (%s) as null',
    async (resume) => {
      findPublished.mockResolvedValue({ ...published, resume });
      const { getSiteSettings } = await importFresh();

      await expect(getSiteSettings()).resolves.toMatchObject({ resumeUrl: null });
    }
  );

  /**
   * No fallback to source (docs/adr/0001). Unseeded or unpublished settings
   * fail the build, which leaves the current site up.
   */
  it('throws when the settings have never been published', async () => {
    findPublished.mockResolvedValue(null);
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).rejects.toThrow('Site settings are not published');
  });

  it('says how to fix unpublished settings', async () => {
    findPublished.mockResolvedValue(null);
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).rejects.toThrow('pnpm seed');
  });

  it('lets a database failure surface', async () => {
    findPublished.mockRejectedValue(new Error('ECONNREFUSED'));
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).rejects.toThrow('ECONNREFUSED');
  });
});
