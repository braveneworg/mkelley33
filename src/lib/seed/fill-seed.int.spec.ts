/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { fillSeed } from '@/lib/seed/fill-seed';
import type { Seed } from '@/lib/seed/seed-files';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const seed: Seed = {
  // The committed Seed's own directory, for the one real file a fill uploads.
  directory: 'seed',
  services: [
    {
      credibility: 'first credibility',
      deliverables: ['one', 'two'],
      name: 'First',
      pitch: 'first pitch',
      slug: 'first',
    },
    {
      credibility: 'second credibility',
      deliverables: ['three'],
      name: 'Second',
      pitch: 'second pitch',
      slug: 'second',
    },
  ],
  siteSettings: {
    description: 'seed description',
    name: 'Seed Name',
    repoUrl: null,
    resume: 'files/michaux-kelley-resume.pdf',
    socials: {
      bluesky: null,
      github: 'https://example.com/github',
      linkedin: 'https://example.com/linkedin',
    },
    tagline: 'seed tagline',
    title: 'seed title',
  },
};

const serviceNames = async (): Promise<string[]> => {
  const { docs } = await payload.find({ collection: 'services', sort: 'order' });
  return docs.map(({ name }) => name);
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

describe('fillSeed on an empty database', () => {
  it('creates every record', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual(['site settings', 'service first', 'service second']);
  });

  it('keeps nothing, because nothing was there', async () => {
    const report = await fillSeed(payload, seed);

    expect(report.kept).toEqual([]);
  });

  it('stores the services in the order the Seed lists them', async () => {
    await fillSeed(payload, seed);

    await expect(serviceNames()).resolves.toEqual(['First', 'Second']);
  });

  /**
   * Seeded settings have to be live at once: the build that follows renders
   * every page from them, and it reads as a visitor would.
   */
  it('publishes the Site settings it creates', async () => {
    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ overrideAccess: false, slug: 'site-settings' });
    expect(settings._status).toBe('published');
  });

  it('uploads the Resume and points Site settings at it', async () => {
    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ depth: 1, slug: 'site-settings' });
    expect(settings.resume).toMatchObject({
      filename: 'michaux-kelley-resume.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('uploads no Resume when the Seed carries none', async () => {
    await fillSeed(payload, { ...seed, siteSettings: { ...seed.siteSettings, resume: null } });

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 0,
    });
  });
});

describe('fillSeed on a database that is already filled', () => {
  it('creates nothing', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.created).toEqual([]);
  });

  it('reports what it left alone', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, seed);

    expect(report.kept).toEqual(['site settings', 'service first', 'service second']);
  });

  it('uploads the Resume once, however often it runs', async () => {
    await fillSeed(payload, seed);
    await fillSeed(payload, seed);

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 1,
    });
  });

  /**
   * The whole point of fill-only: the owner edits in the admin, and running
   * the Seed again — which every deploy's instructions ask for — must not
   * put the old text back.
   */
  it('never overwrites a service the owner has edited', async () => {
    await fillSeed(payload, seed);
    await payload.update({
      collection: 'services',
      data: { name: 'Edited by the owner' },
      where: { slug: { equals: 'first' } },
    });

    await fillSeed(payload, seed);

    await expect(serviceNames()).resolves.toEqual(['Edited by the owner', 'Second']);
  });

  it('never overwrites Site settings the owner has edited', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { _status: 'published', tagline: 'edited by the owner' },
      slug: 'site-settings',
    });

    await fillSeed(payload, seed);

    const settings = await payload.findGlobal({ slug: 'site-settings' });
    expect(settings.tagline).toBe('edited by the owner');
  });

  /** A draft is still the owner's work in progress; the Seed keeps out of it. */
  it('leaves Site settings alone when only a draft has been saved since', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({
      data: { tagline: 'a draft tagline' },
      draft: true,
      slug: 'site-settings',
    });

    const report = await fillSeed(payload, seed);

    expect(report.kept).toContain('site settings');
  });

  it('creates only the record that is missing', async () => {
    await fillSeed(payload, seed);

    const report = await fillSeed(payload, {
      ...seed,
      services: [
        ...seed.services,
        {
          credibility: 'third credibility',
          deliverables: ['four'],
          name: 'Third',
          pitch: 'third pitch',
          slug: 'third',
        },
      ],
    });

    expect(report.created).toEqual(['service third']);
  });
});

describe('fillSeed when the owner got there first', () => {
  /**
   * Settings saved only as a draft have no published record at all, but they
   * are still the owner's. Publishing the Seed over them would discard work.
   */
  it('leaves draft-only Site settings alone', async () => {
    await payload.updateGlobal({
      data: { tagline: "the owner's first draft" },
      draft: true,
      slug: 'site-settings',
    });

    const report = await fillSeed(payload, seed);

    expect(report.kept).toContain('site settings');
  });

  it('does not publish over draft-only Site settings', async () => {
    await payload.updateGlobal({
      data: { tagline: "the owner's first draft" },
      draft: true,
      slug: 'site-settings',
    });

    await fillSeed(payload, seed);

    const draft = await payload.findGlobal({ draft: true, slug: 'site-settings' });
    expect(draft.tagline).toBe("the owner's first draft");
  });
});

describe('fillSeed when saving the Site settings fails', () => {
  /** A link the admin would refuse, which the schema normally keeps out of a Seed. */
  const unsaveable: Seed = {
    ...seed,
    siteSettings: {
      ...seed.siteSettings,
      socials: { ...seed.siteSettings.socials, github: 'not-an-address' },
    },
  };

  it('fails', async () => {
    await expect(fillSeed(payload, unsaveable)).rejects.toThrow();
  });

  /**
   * The Resume is uploaded before the settings that point at it are saved.
   * If the save fails, the upload must not stay behind: the next run would
   * upload a second copy beside it.
   */
  it('removes the Resume it had just uploaded', async () => {
    await fillSeed(payload, unsaveable).catch(() => undefined);

    await expect(payload.count({ collection: 'resume-files' })).resolves.toMatchObject({
      totalDocs: 0,
    });
  });
});

describe('the Resume uploads collection', () => {
  /** The address the Resume is served at promises a PDF. */
  it('refuses an upload that is not a PDF', async () => {
    await expect(
      payload.create({
        collection: 'resume-files',
        data: {},
        file: { data: Buffer.from('plain text'), mimetype: 'text/plain', name: 'cv.txt', size: 10 },
      })
    ).rejects.toThrow();
  });
});
