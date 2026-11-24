/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readUpload } from '@/lib/seed/read-upload';

import type { Payload, SanitizedCollectionConfig } from 'payload';

vi.mock('payload', () => ({ createLocalReq: vi.fn(async () => ({ local: true })) }));

const payload = {} as Payload;

let staticDir: string;

beforeEach(() => {
  staticDir = mkdtempSync(join(tmpdir(), 'uploads-'));
});

afterEach(() => {
  rmSync(staticDir, { force: true, recursive: true });
});

/** An upload collection, as far as reading a file back needs it. */
const collection = (handlers?: unknown[]): SanitizedCollectionConfig =>
  ({ slug: 'media', upload: { handlers, staticDir } }) as unknown as SanitizedCollectionConfig;

describe('readUpload with no storage configured', () => {
  /** Payload wrote the file to this machine's disk, so that is where it is. */
  it('reads the file from the collection’s directory', async () => {
    writeFileSync(join(staticDir, 'headshot.webp'), 'the bytes');

    const bytes = await readUpload(payload, collection(), { filename: 'headshot.webp', id: '1' });

    expect(bytes.toString()).toBe('the bytes');
  });

  /**
   * The usual cause: the live database, read without the storage token. The
   * record is there and the file is in storage, where this cannot look.
   */
  it('says what is wrong when the file is not on this disk', async () => {
    await expect(
      readUpload(payload, collection(), { filename: 'headshot.webp', id: '1' })
    ).rejects.toThrow(
      'The upload headshot.webp is not on this machine. If this is the live database, ' +
        'set BLOB_READ_WRITE_TOKEN so that uploads can be read from storage.'
    );
  });

  it('refuses a file name that would leave the directory', async () => {
    await expect(
      readUpload(payload, collection(), { filename: '../outside.webp', id: '1' })
    ).rejects.toThrow('The upload ../outside.webp has a name that leaves its directory.');
  });

  it('refuses an upload that has no file name', async () => {
    await expect(readUpload(payload, collection(), { filename: null, id: '1' })).rejects.toThrow(
      'The upload 1 in media has no file.'
    );
  });
});

describe('readUpload with storage configured', () => {
  const stored = () => new Response('from storage');

  it('reads the file through the storage’s own handler', async () => {
    const bytes = await readUpload(payload, collection([stored]), { filename: 'a.webp', id: '1' });

    expect(bytes.toString()).toBe('from storage');
  });

  it('asks the handler for the file by its record and name', async () => {
    const handler = vi.fn(stored);
    const doc = { filename: 'a.webp', id: '1' };

    await readUpload(payload, collection([handler]), doc);

    expect(handler).toHaveBeenCalledWith(
      { local: true },
      expect.objectContaining({ doc, params: { collection: 'media', filename: 'a.webp' } })
    );
  });

  it('moves on to the next handler when one has nothing to say', async () => {
    const bytes = await readUpload(payload, collection([() => undefined, stored]), {
      filename: 'a.webp',
      id: '1',
    });

    expect(bytes.toString()).toBe('from storage');
  });

  /** A Seed built without a file it should hold would upload nothing in its place. */
  it('fails when storage does not hand the file over', async () => {
    const missing = () => new Response(null, { status: 404 });

    await expect(
      readUpload(payload, collection([missing]), { filename: 'a.webp', id: '1' })
    ).rejects.toThrow('Storage answered 404 for the upload a.webp.');
  });

  /** The storage handler answers 204 when its own fetch of the file failed. */
  it('fails when storage answers with no content', async () => {
    const empty = () => new Response(null, { status: 204 });

    await expect(
      readUpload(payload, collection([empty]), { filename: 'a.webp', id: '1' })
    ).rejects.toThrow('Storage answered 204 for the upload a.webp.');
  });
});
