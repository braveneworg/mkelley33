/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { get, list, put } from '@vercel/blob';

import { vercelBlobStore } from '@/lib/media-backup/blob-store';

vi.mock('@vercel/blob', () => ({ get: vi.fn(), list: vi.fn(), put: vi.fn() }));

/** Shaped like a token, and not one. */
const TOKEN = 'a-placeholder-token';
const STORE_URL = 'https://examplestore.public.blob.vercel-storage.com';

type ListedBlob = Awaited<ReturnType<typeof list>>['blobs'][number];
type FoundBlob = NonNullable<Awaited<ReturnType<typeof get>>>;

const listed = (pathname: string, size: number): ListedBlob => ({
  downloadUrl: `${STORE_URL}/${pathname}?download=1`,
  etag: '"an-etag"',
  pathname,
  size,
  uploadedAt: new Date('2026-11-22T08:00:00.000Z'),
  url: `${STORE_URL}/${pathname}`,
});

const found = (pathname: string, text: string, contentType: string): FoundBlob => ({
  blob: {
    cacheControl: 'public, max-age=31536000',
    contentDisposition: `inline; filename="${pathname}"`,
    contentType,
    downloadUrl: `${STORE_URL}/${pathname}?download=1`,
    etag: '"an-etag"',
    pathname,
    size: Buffer.byteLength(text),
    uploadedAt: new Date('2026-11-22T08:00:00.000Z'),
    url: `${STORE_URL}/${pathname}`,
  },
  headers: new Headers(),
  statusCode: 200,
  stream: new Response(text).body ?? new ReadableStream<Uint8Array>(),
});

const unchanged = (pathname: string): FoundBlob => ({
  blob: {
    cacheControl: '',
    contentDisposition: '',
    contentType: null,
    downloadUrl: `${STORE_URL}/${pathname}?download=1`,
    etag: '"an-etag"',
    pathname,
    size: null,
    uploadedAt: new Date('2026-11-22T08:00:00.000Z'),
    url: `${STORE_URL}/${pathname}`,
  },
  headers: new Headers(),
  statusCode: 304,
  stream: null,
});

describe('vercelBlobStore', () => {
  describe('list', () => {
    it('describes every file the store holds', async () => {
      vi.mocked(list).mockResolvedValueOnce({ blobs: [listed('a.png', 3)], hasMore: false });

      await expect(vercelBlobStore(TOKEN).list()).resolves.toEqual([
        {
          pathname: 'a.png',
          size: 3,
          uploadedAt: '2026-11-22T08:00:00.000Z',
          url: `${STORE_URL}/a.png`,
        },
      ]);
    });

    it('follows the cursor until the store has no more to list', async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ blobs: [listed('a.png', 3)], cursor: 'page-2', hasMore: true })
        .mockResolvedValueOnce({ blobs: [listed('b.png', 4)], hasMore: false });

      const blobs = await vercelBlobStore(TOKEN).list();

      expect(blobs.map(({ pathname }) => pathname)).toEqual(['a.png', 'b.png']);
    });

    it('asks for the next page with the cursor the last one gave', async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ blobs: [listed('a.png', 3)], cursor: 'page-2', hasMore: true })
        .mockResolvedValueOnce({ blobs: [listed('b.png', 4)], hasMore: false });

      await vercelBlobStore(TOKEN).list();

      expect(list).toHaveBeenLastCalledWith({ cursor: 'page-2', token: TOKEN });
    });

    it('leaves out a folder, which holds no bytes of its own', async () => {
      vi.mocked(list).mockResolvedValueOnce({
        blobs: [listed('posts/', 0), listed('posts/cover.png', 5)],
        hasMore: false,
      });

      const blobs = await vercelBlobStore(TOKEN).list();

      expect(blobs.map(({ pathname }) => pathname)).toEqual(['posts/cover.png']);
    });
  });

  describe('read', () => {
    it('returns the bytes of the file and its content type', async () => {
      vi.mocked(get).mockResolvedValueOnce(found('a.png', 'a picture', 'image/png'));

      await expect(vercelBlobStore(TOKEN).read(`${STORE_URL}/a.png`)).resolves.toEqual({
        bytes: Buffer.from('a picture'),
        contentType: 'image/png',
      });
    });

    it('asks for the file by its address, as a public one', async () => {
      vi.mocked(get).mockResolvedValueOnce(found('a.png', 'a picture', 'image/png'));

      await vercelBlobStore(TOKEN).read(`${STORE_URL}/a.png`);

      expect(get).toHaveBeenCalledWith(`${STORE_URL}/a.png`, { access: 'public', token: TOKEN });
    });

    it('fails when the store no longer has the file', async () => {
      vi.mocked(get).mockResolvedValueOnce(null);

      await expect(vercelBlobStore(TOKEN).read(`${STORE_URL}/gone.png`)).rejects.toThrow(
        `Storage has no file at ${STORE_URL}/gone.png.`
      );
    });

    it('fails when the store answers without the file’s bytes', async () => {
      vi.mocked(get).mockResolvedValueOnce(unchanged('a.png'));

      await expect(vercelBlobStore(TOKEN).read(`${STORE_URL}/a.png`)).rejects.toThrow(
        `Storage has no file at ${STORE_URL}/a.png.`
      );
    });
  });

  describe('write', () => {
    it('puts the file back under the very name it had', async () => {
      const bytes = Buffer.from('a picture');

      await vercelBlobStore(TOKEN).write({
        bytes,
        contentType: 'image/png',
        pathname: 'a-x1Y2z3.png',
      });

      expect(put).toHaveBeenCalledWith('a-x1Y2z3.png', bytes, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 31_536_000,
        contentType: 'image/png',
        token: TOKEN,
      });
    });
  });
});
