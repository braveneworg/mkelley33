/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Looks at a database the way the Seed would, and writes nothing. It answers
 * the two questions worth asking before a fill of the live site, or after
 * one that failed part-way: what would be created, and what state are the
 * Site settings and their Resume in.
 */

import { findPageId, pageLabel } from '@/lib/seed/fill-pages';
import {
  menusNeverStored,
  serviceExists,
  serviceLabel,
  SITE_SETTINGS_LABEL,
  siteSettingsExist,
  whyMenusMustWait,
} from '@/lib/seed/fill-seed';
import type { Seed } from '@/lib/seed/seed-files';

import type { Payload } from 'payload';

export interface SeedInspection {
  /**
   * Why a fill would not add the menus the Site settings have never had, or
   * null when it would, or when there are none to add.
   */
  readonly menusMustWait: null | string;
  /**
   * What the database lacks: Seed records, and menus that Site settings
   * saved before menus existed have never had. A fill would create these.
   */
  readonly missing: string[];
  /** Seed records the database has. A fill would leave these alone. */
  readonly present: string[];
  /**
   * The Resume the Site settings point at: `attached` when the upload is
   * there, `dangling` when it is gone, `none` when they point at nothing.
   */
  readonly resume: 'attached' | 'dangling' | 'none';
  /**
   * `missing` — never saved. `draft-only` — saved, never published.
   * `unpublished` — published once and then unpublished; visitors still get
   * the last published version.
   */
  readonly siteSettings: 'draft-only' | 'missing' | 'published' | 'unpublished';
  /**
   * Resume uploads the Site settings do not point at. A Seed that failed
   * after uploading leaves one; so does replacing the Resume in the admin.
   * They are private, and the owner can delete them there.
   */
  readonly unattachedResumeFiles: number;
}

const SITE_SETTINGS = 'site-settings';

const statusOf = (
  exists: boolean,
  record: { _status?: null | string; createdAt?: null | string }
): SeedInspection['siteSettings'] => {
  if (!exists) {
    return 'missing';
  }
  if (!record.createdAt) {
    return 'draft-only';
  }
  return record._status === 'published' ? 'published' : 'unpublished';
};

/** Reads only. Safe to run against any database, as often as needed. */
export const inspectSeed = async (payload: Payload, seed: Seed): Promise<SeedInspection> => {
  const missing: string[] = [];
  const present: string[] = [];
  const sort = (label: string, exists: boolean): void => {
    (exists ? present : missing).push(label);
  };

  for (const page of seed.pages) {
    sort(pageLabel(page), (await findPageId(payload, page.slug)) !== null);
  }
  const settingsExist = await siteSettingsExist(payload);
  sort(SITE_SETTINGS_LABEL, settingsExist);
  const newMenus = settingsExist ? await menusNeverStored(payload) : [];
  missing.push(...newMenus.map(({ label }) => label));
  for (const service of seed.services) {
    sort(serviceLabel(service), await serviceExists(payload, service));
  }

  const record = await payload.findGlobal({ depth: 0, slug: SITE_SETTINGS });
  const resumeId = typeof record.resume === 'string' ? record.resume : null;
  const uploads = await payload.count({ collection: 'resume-files' });
  const attached =
    resumeId === null
      ? 0
      : (await payload.count({ collection: 'resume-files', where: { id: { equals: resumeId } } }))
          .totalDocs;

  return {
    menusMustWait: newMenus.length === 0 ? null : await whyMenusMustWait(payload),
    missing,
    present,
    resume: resumeId === null ? 'none' : attached > 0 ? 'attached' : 'dangling',
    siteSettings: statusOf(settingsExist, record),
    unattachedResumeFiles: uploads.totalDocs - attached,
  };
};
