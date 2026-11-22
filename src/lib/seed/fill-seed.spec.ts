/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { fillSeed } from '@/lib/seed/fill-seed';
import type { Seed } from '@/lib/seed/seed-files';

import type { Payload } from 'payload';

/**
 * The failure paths of the fill, which a real database will not produce on
 * demand. The first run against the live site hit one (2026-11-22): the
 * database refused the Site settings save part-way, and the cleanup that
 * followed failed too and reported its own error in place of the real one.
 */

const seed: Seed = {
  directory: 'seed',
  services: [],
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

const UPLOAD_ID = 'upload-1';
const saveFailure = new Error('the database refused the save');

interface Fake {
  readonly deleteUpload: ReturnType<typeof vi.fn>;
  readonly payload: Payload;
}

/**
 * A Payload whose Site settings were never saved, whose Resume upload
 * succeeds, and whose settings save fails. `recordAfterFailure` is what a
 * read of the settings returns once that save has failed.
 */
const failingPayload = (
  recordAfterFailure: { resume?: string },
  deleteUpload = vi.fn().mockResolvedValue({})
): Fake => {
  const findGlobal = vi.fn().mockResolvedValueOnce({}).mockResolvedValue(recordAfterFailure);
  return {
    deleteUpload,
    payload: {
      countGlobalVersions: vi.fn().mockResolvedValue({ totalDocs: 0 }),
      create: vi.fn().mockResolvedValue({ id: UPLOAD_ID }),
      delete: deleteUpload,
      findGlobal,
      updateGlobal: vi.fn().mockRejectedValue(saveFailure),
    } as unknown as Payload,
  };
};

describe('fillSeed when the Site settings save fails', () => {
  it('fails with the save failure', async () => {
    const { payload } = failingPayload({});

    await expect(fillSeed(payload, seed)).rejects.toBe(saveFailure);
  });

  it('removes the Resume it had just uploaded', async () => {
    const { deleteUpload, payload } = failingPayload({});

    await fillSeed(payload, seed).catch(() => undefined);

    expect(deleteUpload).toHaveBeenCalledWith({ collection: 'resume-files', id: UPLOAD_ID });
  });

  /**
   * The cleanup is a courtesy. When it fails as well, the error worth
   * reporting is still the one that stopped the Seed.
   */
  it('still fails with the save failure when the cleanup fails too', async () => {
    const { payload } = failingPayload({}, vi.fn().mockRejectedValue(new Error('lock timeout')));

    await expect(fillSeed(payload, seed)).rejects.toBe(saveFailure);
  });

  /**
   * A save can fail after it has written the record — its version history
   * is saved second. If the settings now point at the upload, the upload is
   * in use, and deleting it would leave them pointing at nothing.
   */
  it('keeps the Resume when the settings were saved before the failure', async () => {
    const { deleteUpload, payload } = failingPayload({ resume: UPLOAD_ID });

    await fillSeed(payload, seed).catch(() => undefined);

    expect(deleteUpload).not.toHaveBeenCalled();
  });

  it('still fails when the settings were saved before the failure', async () => {
    const { payload } = failingPayload({ resume: UPLOAD_ID });

    await expect(fillSeed(payload, seed)).rejects.toBe(saveFailure);
  });
});
