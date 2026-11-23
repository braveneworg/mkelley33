/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import { fillSeed } from '@/lib/seed/fill-seed';
import { inspectSeed } from '@/lib/seed/inspect-seed';
import { loadSeed } from '@/lib/seed/seed-files';
import { createTestPayload } from '@/test/payload-harness';

import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

const seed = loadSeed('seed');
const pdf = readFileSync('seed/files/michaux-kelley-resume.pdf');

const uploadPdf = (name: string): Promise<{ id: string }> =>
  payload.create({
    collection: 'resume-files',
    data: {},
    file: { data: pdf, mimetype: 'application/pdf', name, size: pdf.length },
  });

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

describe('inspectSeed on an empty database', () => {
  it('lists every Seed record as missing', async () => {
    const { missing } = await inspectSeed(payload, seed);

    expect(missing).toEqual([
      ...seed.pages.map(({ slug }) => `page ${slug}`),
      'site settings',
      ...seed.services.map(({ slug }) => `service ${slug}`),
    ]);
  });

  it('reports the Site settings as missing', async () => {
    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({ siteSettings: 'missing' });
  });

  /** It exists to be run against the live database before anything is decided. */
  it('writes nothing', async () => {
    await inspectSeed(payload, seed);

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({
      present: [],
      unattachedResumeFiles: 0,
    });
  });
});

describe('inspectSeed on a filled database', () => {
  it('lists every Seed record as present', async () => {
    await fillSeed(payload, seed);

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({ missing: [] });
  });

  it('reports the Site settings as published, with their Resume attached', async () => {
    await fillSeed(payload, seed);

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({
      resume: 'attached',
      siteSettings: 'published',
      unattachedResumeFiles: 0,
    });
  });

  it('has no menus left to add', async () => {
    await fillSeed(payload, seed);

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({ menusMustWait: null });
  });

  it('reports unpublished Site settings', async () => {
    await fillSeed(payload, seed);
    await payload.updateGlobal({ data: { _status: 'draft' }, slug: 'site-settings' });

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({
      siteSettings: 'unpublished',
    });
  });
});

/** The live record was saved before menus existed; see the fill's own spec. */
describe('inspectSeed on Site settings that have never had a menu', () => {
  beforeEach(async () => {
    await fillSeed(payload, seed);
    const { connection } = payload.db as MongooseAdapter;
    await connection
      .collection('globals')
      .updateOne({ globalType: 'site-settings' }, { $unset: { footerMenu: '', headerMenu: '' } });
  });

  it('lists the menus a fill would add', async () => {
    const { missing } = await inspectSeed(payload, seed);

    expect(missing).toEqual(['site settings header menu', 'site settings footer menu']);
  });

  it('says a fill would add them', async () => {
    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({ menusMustWait: null });
  });

  it('says why a fill would wait when the settings are unpublished', async () => {
    await payload.updateGlobal({ data: { _status: 'draft' }, slug: 'site-settings' });
    const { connection } = payload.db as MongooseAdapter;
    await connection
      .collection('globals')
      .updateOne({ globalType: 'site-settings' }, { $unset: { footerMenu: '', headerMenu: '' } });

    const { menusMustWait } = await inspectSeed(payload, seed);

    expect(menusMustWait).toContain('Site settings are unpublished');
  });
});

describe('inspectSeed after a Seed that failed part-way', () => {
  /**
   * What the first run against the live site left (2026-11-22): the Resume
   * uploaded, the Site settings save refused, the cleanup failed.
   */
  it('counts a Resume upload nothing points at', async () => {
    await uploadPdf('michaux-kelley-resume.pdf');

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({
      resume: 'none',
      siteSettings: 'missing',
      unattachedResumeFiles: 1,
    });
  });

  /** Settings that point at an upload which is gone: the site hides the download. */
  it('reports Site settings whose Resume upload is gone', async () => {
    await fillSeed(payload, seed);
    await payload.delete({ collection: 'resume-files', where: {} });

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({ resume: 'dangling' });
  });

  it('reports Site settings that exist only as a draft', async () => {
    await payload.updateGlobal({
      data: { tagline: 'a first draft' },
      draft: true,
      slug: 'site-settings',
    });

    await expect(inspectSeed(payload, seed)).resolves.toMatchObject({
      siteSettings: 'draft-only',
    });
  });
});
