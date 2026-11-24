/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Writes the Seed into a database, fill-only: what is missing is created,
 * and what exists is left exactly as it is. There is no update path and no
 * reset.
 *
 * That is what makes the Seed safe to run against the live site before every
 * deploy that needs new records (docs/adr/0001): the owner edits in the
 * admin, and running the Seed again can never put the old text back.
 *
 * "Missing" reaches one level into Site settings. A menu is a field added
 * after the live record was first saved, so a record can exist and never
 * have had one. The Seed adds such a field and touches nothing else (owner's
 * decision, 2026-11-23); a menu the owner has since emptied on purpose is
 * stored, and stays empty.
 */

import path from 'node:path';

import { fillPages, type LinkData, toLinkData } from '@/lib/seed/fill-pages';
import { fillPosts } from '@/lib/seed/fill-posts';
import type { LinkSeed } from '@/lib/seed/page-seed';
import type { Seed, ServiceSeed } from '@/lib/seed/seed-files';
import { storedGlobalFields } from '@/lib/seed/stored-fields';

import type { Payload } from 'payload';

export interface SeedReport {
  /** What this run created, as short labels (`service <slug>`), in Seed order. */
  readonly created: string[];
  /** What already existed and was left alone. */
  readonly kept: string[];
  /**
   * What this run would have added and did not, each with the reason. A
   * skipped item is not a failure: running the Seed again once the reason is
   * gone adds it.
   */
  readonly skipped: string[];
  /** How many files this run uploaded — the Resume, and the pictures Pages and posts show. */
  readonly uploads: number;
}

/** How the report names the Site settings — one record, so it has no key. */
export const SITE_SETTINGS_LABEL = 'site settings';

const SITE_SETTINGS = 'site-settings';

/** The Site settings fields that hold a menu, with how the report names each. */
export const MENUS = [
  { field: 'headerMenu', label: 'site settings header menu' },
  { field: 'footerMenu', label: 'site settings footer menu' },
] as const;

/** How the report names a service. */
export const serviceLabel = ({ slug }: ServiceSeed): string => `service ${slug}`;

/** True when a service already holds this slug. */
export const serviceExists = async (payload: Payload, { slug }: ServiceSeed): Promise<boolean> => {
  const existing = await payload.count({
    collection: 'services',
    where: { slug: { equals: slug } },
  });
  return existing.totalDocs > 0;
};

/** True when the service was created, false when one already held its slug. */
const fillService = async (
  payload: Payload,
  service: ServiceSeed,
  order: number
): Promise<boolean> => {
  if (await serviceExists(payload, service)) {
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
export const siteSettingsExist = async (payload: Payload): Promise<boolean> => {
  const record = await payload.findGlobal({ slug: SITE_SETTINGS });
  if (record.createdAt) {
    return true;
  }
  const versions = await payload.countGlobalVersions({ global: SITE_SETTINGS });
  return versions.totalDocs > 0;
};

/**
 * Tidies up after a failed settings save: removes the Resume that was
 * uploaded for it, so the next run does not upload a second copy beside it.
 *
 * Two things it must not do. It must not delete an upload that is in use: a
 * save can fail after it has written the record, because the version
 * history is saved second. And it must not throw: the failure worth
 * reporting is the one that stopped the Seed, not the cleanup's. An upload
 * left behind is private and harmless.
 */
const removeUnusedUpload = async (payload: Payload, uploadId: string): Promise<void> => {
  try {
    const record = await payload.findGlobal({ depth: 0, slug: SITE_SETTINGS });
    if (record.resume === uploadId) {
      return;
    }
    await payload.delete({ collection: 'resume-files', id: uploadId });
  } catch {
    // Best effort — see above.
  }
};

const toMenuData = (menu: readonly LinkSeed[], pageIds: ReadonlyMap<string, string>): LinkData[] =>
  menu.map((item) => toLinkData(item, pageIds));

/**
 * Creates the Site settings when the owner has none. Resolves to how many
 * files it uploaded, or null when settings already existed.
 */
const fillSiteSettings = async (
  payload: Payload,
  { directory, siteSettings }: Seed,
  pageIds: ReadonlyMap<string, string>
): Promise<null | number> => {
  if (await siteSettingsExist(payload)) {
    return null;
  }
  // The Resume belongs to the settings that point at it, so it is uploaded
  // only here: settings that already exist keep whatever Resume they have,
  // including none.
  const { footerMenu, headerMenu, resume: resumeFile, ...settings } = siteSettings;
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
      data: {
        ...settings,
        _status: 'published',
        footerMenu: toMenuData(footerMenu, pageIds),
        headerMenu: toMenuData(headerMenu, pageIds),
        resume: resume?.id ?? null,
      },
      slug: SITE_SETTINGS,
    });
  } catch (error) {
    if (resume !== null) {
      await removeUnusedUpload(payload, resume.id);
    }
    throw error;
  }
  return resume === null ? 0 : 1;
};

/** The menus the stored Site settings have never had, or none when there is no record. */
export const menusNeverStored = async (payload: Payload): Promise<(typeof MENUS)[number][]> => {
  const stored = await storedGlobalFields(payload, SITE_SETTINGS);
  // No record means draft-only settings: the owner's, and not the Seed's to add to.
  return stored === null ? [] : MENUS.filter(({ field }) => !stored.has(field));
};

/**
 * Why the Seed will not add a field to the Site settings as they stand, or
 * null when it may. Adding a field is a published save, and the Seed must
 * not publish on the owner's behalf: not settings the owner has unpublished,
 * and not past changes the owner has saved and not yet published.
 */
export const whyMenusMustWait = async (payload: Payload): Promise<null | string> => {
  const record = await payload.findGlobal({ depth: 0, draft: false, slug: SITE_SETTINGS });
  if (record._status !== 'published') {
    return 'Site settings are unpublished — publish them and run the Seed again';
  }
  const { docs } = await payload.findGlobalVersions({
    depth: 0,
    limit: 1,
    slug: SITE_SETTINGS,
    sort: '-updatedAt',
  });
  return docs[0]?.version._status === 'draft'
    ? 'Site settings have unpublished changes — publish or discard them and run the Seed again'
    : null;
};

/**
 * Adds the menus that Site settings saved before menus existed have never
 * had. Everything the settings already hold stays as it is.
 */
const fillNewMenus = async (
  payload: Payload,
  { siteSettings }: Seed,
  pageIds: ReadonlyMap<string, string>
): Promise<Pick<SeedReport, 'created' | 'skipped'>> => {
  const missing = await menusNeverStored(payload);
  if (missing.length === 0) {
    return { created: [], skipped: [] };
  }
  const reason = await whyMenusMustWait(payload);
  if (reason !== null) {
    return { created: [], skipped: missing.map(({ label }) => `${label} (${reason})`) };
  }
  const wanted = new Set<string>(missing.map(({ field }) => field));
  await payload.updateGlobal({
    data: {
      _status: 'published',
      ...(wanted.has('headerMenu')
        ? { headerMenu: toMenuData(siteSettings.headerMenu, pageIds) }
        : {}),
      ...(wanted.has('footerMenu')
        ? { footerMenu: toMenuData(siteSettings.footerMenu, pageIds) }
        : {}),
    },
    slug: SITE_SETTINGS,
  });
  return { created: missing.map(({ label }) => label), skipped: [] };
};

/** Fills the database from the Seed and reports what it created and what it kept. */
export const fillSeed = async (payload: Payload, seed: Seed): Promise<SeedReport> => {
  // Pages first: a menu item is stored as the id of the Page it points at.
  const pages = await fillPages(payload, seed.directory, seed.pages);
  const created = [...pages.created];
  const kept = [...pages.kept];
  const skipped: string[] = [];
  let { uploads } = pages;

  const settingsUploads = await fillSiteSettings(payload, seed, pages.pageIds);
  if (settingsUploads === null) {
    kept.push(SITE_SETTINGS_LABEL);
    const menus = await fillNewMenus(payload, seed, pages.pageIds);
    created.push(...menus.created);
    skipped.push(...menus.skipped);
  } else {
    created.push(SITE_SETTINGS_LABEL);
    uploads += settingsUploads;
  }

  for (const [order, service] of seed.services.entries()) {
    const wasCreated = await fillService(payload, service, order);
    (wasCreated ? created : kept).push(serviceLabel(service));
  }

  // Posts last: their text may link to a Page.
  const posts = await fillPosts(payload, seed.directory, seed.posts, pages.pageIds);
  created.push(...posts.created);
  kept.push(...posts.kept);
  return { created, kept, skipped, uploads: uploads + posts.uploads };
};
