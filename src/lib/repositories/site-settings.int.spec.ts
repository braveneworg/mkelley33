/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import type * as siteSettingsRepo from '@/lib/repositories/site-settings';
import { fillSeed } from '@/lib/seed/fill-seed';
import { loadSeed } from '@/lib/seed/seed-files';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const importFresh = async (): Promise<typeof siteSettingsRepo> => {
  vi.resetModules();
  return import('@/lib/repositories/site-settings');
};

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from an empty database and arranges what it needs.
beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

describe('the Site settings repository', () => {
  it('throws while the database is unseeded', async () => {
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).rejects.toThrow('Site settings are not published');
  });

  it("returns the committed Seed's settings once it is seeded", async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    const { getSiteSettings } = await importFresh();

    const { footerMenu, headerMenu, resume, ...seeded } = seed.siteSettings;
    await expect(getSiteSettings()).resolves.toEqual({
      ...seeded,
      footerMenu: [{ external: false, href: '/uses', label: 'uses' }],
      headerMenu: [
        { external: false, href: '/', label: './home' },
        { external: false, href: '/blog', label: './blog' },
        { external: false, href: '/services', label: './services' },
        { external: false, href: '/cv', label: './cv' },
        { external: false, href: '/contact', label: './contact' },
      ],
      resumeUrl: `/api/resume-files/file/${String(resume).replace('files/', '')}`,
    });
    // The Seed's menus are these same items, named by address.
    expect([...headerMenu, ...footerMenu].map(({ page }) => page)).toEqual([
      'home',
      'blog',
      'services',
      'cv',
      'contact',
      'uses',
    ]);
  });

  /** The owner's decision of 2026-11-23: hidden, and back when the Page is. */
  it('leaves a menu item out while its Page is unpublished', async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    await payload.update({
      collection: 'pages',
      data: { _status: 'draft' },
      where: { slug: { equals: 'cv' } },
    });
    const { getSiteSettings } = await importFresh();

    const { headerMenu } = await getSiteSettings();

    expect(headerMenu.map(({ label }) => label)).toEqual([
      './home',
      './blog',
      './services',
      './contact',
    ]);
  });

  it('leaves a menu item out once its Page is deleted', async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    await payload.delete({ collection: 'pages', where: { slug: { equals: 'uses' } } });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({ footerMenu: [] });
  });

  /** The owner's unpublished edit must not leak onto the site. */
  it('keeps returning the published settings while a newer draft exists', async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { tagline: 'an unpublished tagline' },
      draft: true,
      slug: 'site-settings',
    });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({
      tagline: seed.siteSettings.tagline,
    });
  });

  /** Settings the owner has only ever drafted are not live. */
  it('throws when the settings exist only as a draft', async () => {
    await payload.updateGlobal({
      data: { tagline: 'never published' },
      draft: true,
      slug: 'site-settings',
    });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).rejects.toThrow('Site settings are not published');
  });

  /**
   * The admin offers Unpublish on Site settings. The site cannot render
   * without them, so unpublishing must not take them away from visitors: they
   * keep the last published version until the owner publishes again.
   */
  it('keeps returning the last published settings after an unpublish', async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    await payload.updateGlobal({ data: { _status: 'draft' }, slug: 'site-settings' });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({ name: seed.siteSettings.name });
  });

  it('does not pick up edits made while unpublished', async () => {
    const seed = loadSeed('seed');
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { _status: 'draft', tagline: 'edited while unpublished' },
      slug: 'site-settings',
    });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({
      tagline: seed.siteSettings.tagline,
    });
  });

  it('returns the newest published version, not an older one', async () => {
    await fillSeed(payload, loadSeed('seed'));
    await payload.updateGlobal({
      data: { _status: 'published', tagline: 'published second' },
      slug: 'site-settings',
    });
    await payload.updateGlobal({ data: { _status: 'draft' }, slug: 'site-settings' });
    const { getSiteSettings } = await importFresh();

    await expect(getSiteSettings()).resolves.toMatchObject({ tagline: 'published second' });
  });
});

describe('publishing Site settings', () => {
  /** A blank profile link would render as an empty href in three places. */
  it.each(['github', 'linkedin'] as const)('refuses an empty %s link', async (link) => {
    await fillSeed(payload, loadSeed('seed'));
    const { socials } = await payload.findGlobal({ slug: 'site-settings' });

    await expect(
      payload.updateGlobal({
        data: { _status: 'published', socials: { ...socials, [link]: '' } },
        slug: 'site-settings',
      })
    ).rejects.toThrow();
  });
});

describe('who can read a Resume file', () => {
  /** Payload checks an upload's real content, so this is a real PDF under another name. */
  const pdf = readFileSync('seed/files/michaux-kelley-resume.pdf');

  const uploadPdf = (name: string): Promise<{ id: string }> =>
    payload.create({
      collection: 'resume-files',
      data: {},
      file: { data: pdf, mimetype: 'application/pdf', name, size: pdf.length },
    });

  const visibleToVisitors = async (): Promise<(null | string | undefined)[]> => {
    const { docs } = await payload.find({ collection: 'resume-files', overrideAccess: false });
    return docs.map(({ filename }) => filename);
  };

  it('lets visitors read the Resume the published settings point at', async () => {
    await fillSeed(payload, loadSeed('seed'));

    await expect(visibleToVisitors()).resolves.toEqual(['michaux-kelley-resume.pdf']);
  });

  /**
   * An upload is not public by being uploaded. One the owner has attached to
   * a draft, replaced, or never attached is none of a visitor's business.
   */
  it('hides an upload the published settings do not point at', async () => {
    await fillSeed(payload, loadSeed('seed'));
    await uploadPdf('next-version.pdf');

    await expect(visibleToVisitors()).resolves.toEqual(['michaux-kelley-resume.pdf']);
  });

  it('hides an upload attached only to a draft of the settings', async () => {
    await fillSeed(payload, loadSeed('seed'));
    const draftResume = await uploadPdf('draft-version.pdf');
    await payload.updateGlobal({
      data: { resume: draftResume.id },
      draft: true,
      slug: 'site-settings',
    });

    await expect(visibleToVisitors()).resolves.toEqual(['michaux-kelley-resume.pdf']);
  });

  it('refuses visitors every upload while no settings are published', async () => {
    await uploadPdf('orphan.pdf');

    await expect(visibleToVisitors()).rejects.toThrow('not allowed');
  });

  it('shows the signed-in owner every upload', async () => {
    await fillSeed(payload, loadSeed('seed'));
    await uploadPdf('next-version.pdf');
    const owner = await payload.create({
      collection: 'users',
      data: { email: 'owner@example.com', password: 'a-long-test-password' },
    });

    const { docs } = await payload.find({
      collection: 'resume-files',
      overrideAccess: false,
      user: { ...owner, collection: 'users' },
    });

    expect(docs).toHaveLength(2);
  });
});
