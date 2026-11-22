/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { databaseUrl, publishedMongoUrl } from '@/lib/harness/mongo-url';

describe('publishedMongoUrl', () => {
  it('turns the published address into a connection string', () => {
    expect(publishedMongoUrl('127.0.0.1:55017')).toBe('mongodb://127.0.0.1:55017');
  });

  it('ignores the trailing newline the CLI prints', () => {
    expect(publishedMongoUrl('127.0.0.1:55017\n')).toBe('mongodb://127.0.0.1:55017');
  });

  /** The compose file binds loopback only; anything else means it was changed. */
  it('refuses an address that is not loopback', () => {
    expect(publishedMongoUrl('0.0.0.0:55017')).toBeNull();
  });

  /**
   * The capture holds stderr as well as stdout, so a warning compose prints
   * beside the address must not turn a working run into a failure.
   */
  it('finds the address among other lines compose printed', () => {
    expect(publishedMongoUrl('time="2026-11-22" level=warning msg="x"\n127.0.0.1:55017\n')).toBe(
      'mongodb://127.0.0.1:55017'
    );
  });

  it('refuses output with more than one address', () => {
    expect(publishedMongoUrl('127.0.0.1:55017\n127.0.0.1:55018')).toBeNull();
  });

  it('refuses empty output', () => {
    expect(publishedMongoUrl('')).toBeNull();
  });

  it('refuses output that is not an address', () => {
    expect(publishedMongoUrl('no such service: mongo')).toBeNull();
  });
});

describe('databaseUrl', () => {
  /** A new database name on the same server is what "a fresh database" means here. */
  it('names a database on the server', () => {
    expect(databaseUrl('mongodb://mongo:27017', 'e2e-1')).toBe('mongodb://mongo:27017/e2e-1');
  });
});
