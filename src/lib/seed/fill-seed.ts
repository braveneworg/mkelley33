/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Writes the Seed into a database, fill-only: a record that is missing is
 * created, and a record that exists is left exactly as it is. There is no
 * update path and no reset.
 *
 * That is what makes the Seed safe to run against the live site before every
 * deploy that needs new records (docs/adr/0001): the owner edits in the
 * admin, and running the Seed again can never put the old text back.
 */

import path from 'node:path';

import type { Seed, ServiceSeed } from '@/lib/seed/seed-files';

import type { Payload } from 'payload';

export interface SeedReport {
  /** What this run created, as short labels (`service <slug>`), in Seed order. */
  readonly created: string[];
  /** What already existed and was left alone. */
  readonly kept: string[];
}

/** How the report names the Site settings — one record, so it has no key. */
export const SITE_SETTINGS_LABEL = 'site settings';

const SITE_SETTINGS = 'site-settings';

/** True when the service was created, false when one already held its slug. */
const fillService = async (
  payload: Payload,
  service: ServiceSeed,
  order: number
): Promise<boolean> => {
  const existing = await payload.count({
    collection: 'services',
    where: { slug: { equals: service.slug } },
  });
  if (existing.totalDocs > 0) {
    return false;
  }
  await payload.create({ collection: 'services', data: { ...service, order } });
  return true;
};

/**
 * Site settings are one record, not a list, so "missing" means never saved.
 * A published save leaves a record with a creation date. A draft saved
 * before anything was published leaves no record at all, only a version —
 * and it is still the owner's work, so it counts.
 */
const siteSettingsExist = async (payload: Payload): Promise<boolean> => {
  const record = await payload.findGlobal({ slug: SITE_SETTINGS });
  if (record.createdAt) {
    return true;
  }
  const versions = await payload.countGlobalVersions({ global: SITE_SETTINGS });
  return versions.totalDocs > 0;
};

/** True when the Site settings were created, false when the owner already had some. */
const fillSiteSettings = async (
  payload: Payload,
  { directory, siteSettings }: Seed
): Promise<boolean> => {
  if (await siteSettingsExist(payload)) {
    return false;
  }
  // The Resume belongs to the settings that point at it, so it is uploaded
  // only here: settings that already exist keep whatever Resume they have,
  // including none.
  const { resume: resumeFile, ...settings } = siteSettings;
  const resume =
    resumeFile === null
      ? null
      : await payload.create({
          collection: 'resume-files',
          data: {},
          filePath: path.resolve(directory, resumeFile),
        });
  try {
    // Published at once: the build that follows renders every page from them.
    await payload.updateGlobal({
      data: { ...settings, _status: 'published', resume: resume?.id ?? null },
      slug: SITE_SETTINGS,
    });
  } catch (error) {
    // Nothing points at the upload now. Left behind, the next run would
    // upload a second copy beside it.
    if (resume !== null) {
      await payload.delete({ collection: 'resume-files', id: resume.id });
    }
    throw error;
  }
  return true;
};

/** Fills the database from the Seed and reports what it created and what it kept. */
export const fillSeed = async (payload: Payload, seed: Seed): Promise<SeedReport> => {
  const report: SeedReport = { created: [], kept: [] };
  const record = (label: string, wasCreated: boolean): void => {
    (wasCreated ? report.created : report.kept).push(label);
  };

  record(SITE_SETTINGS_LABEL, await fillSiteSettings(payload, seed));
  for (const [order, service] of seed.services.entries()) {
    record(`service ${service.slug}`, await fillService(payload, service, order));
  }
  return report;
};
