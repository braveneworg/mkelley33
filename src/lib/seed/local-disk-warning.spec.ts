/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { localDiskWarning } from '@/lib/seed/local-disk-warning';

const createdSettings = { created: ['site settings', 'service audit'], kept: [] };
const keptSettings = { created: ['service audit'], kept: ['site settings'] };

describe('localDiskWarning', () => {
  /**
   * The case that breaks the live site quietly: the record lands in the
   * database, the file lands on the laptop that ran the Seed.
   */
  it('warns when a Resume was uploaded with no blob storage configured', () => {
    expect(localDiskWarning(createdSettings, 'files/resume.pdf', undefined)).toContain(
      'BLOB_READ_WRITE_TOKEN'
    );
  });

  it('treats an empty token as no blob storage', () => {
    expect(localDiskWarning(createdSettings, 'files/resume.pdf', '')).not.toBeNull();
  });

  it('says nothing when blob storage is configured', () => {
    expect(localDiskWarning(createdSettings, 'files/resume.pdf', 'a-token')).toBeNull();
  });

  /** Existing settings keep their Resume; nothing was uploaded this run. */
  it('says nothing when the Site settings already existed', () => {
    expect(localDiskWarning(keptSettings, 'files/resume.pdf', undefined)).toBeNull();
  });

  it('says nothing when the Seed carries no Resume', () => {
    expect(localDiskWarning(createdSettings, null, undefined)).toBeNull();
  });
});
