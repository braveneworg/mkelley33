/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { localDiskWarning } from '@/lib/seed/local-disk-warning';

describe('localDiskWarning', () => {
  /**
   * The case that breaks the live site quietly: the record lands in the
   * database, the file lands on the laptop that ran the Seed.
   */
  it('warns when files were uploaded with no blob storage configured', () => {
    expect(localDiskWarning({ uploads: 2 }, undefined)).toContain('BLOB_READ_WRITE_TOKEN');
  });

  it('says how many files it means', () => {
    expect(localDiskWarning({ uploads: 2 }, undefined)).toContain('2 file(s)');
  });

  it('treats an empty token as no blob storage', () => {
    expect(localDiskWarning({ uploads: 1 }, '')).not.toBeNull();
  });

  it('says nothing when blob storage is configured', () => {
    expect(localDiskWarning({ uploads: 1 }, 'a-token')).toBeNull();
  });

  /** Records that already existed keep their files; nothing was uploaded this run. */
  it('says nothing when the run uploaded nothing', () => {
    expect(localDiskWarning({ uploads: 0 }, undefined)).toBeNull();
  });
});
