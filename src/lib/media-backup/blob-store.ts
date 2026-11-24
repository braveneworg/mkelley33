/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The blob store as the media backup and restore need it: list what is
 * there, read a file, put a file back. `vercelBlobStore` is the only
 * implementation that talks to a network; the specs of the backup and the
 * restore run against `fake-blob-store.ts` instead.
 *
 * The token is handed in by the caller and passed to the SDK as an option —
 * never read from the environment here, never put on a command line, never
 * part of a message this module writes.
 */

import { get, list, put } from '@vercel/blob';

/** A file the store holds, as a listing describes it. */
export interface StoredBlob {
  pathname: string;
  size: number;
  /** ISO 8601. */
  uploadedAt: string;
  /** The file's own address, which is what it is read by. */
  url: string;
}

export interface BlobContent {
  bytes: Buffer;
  contentType: string;
}

export interface BlobUpload extends BlobContent {
  pathname: string;
}

export interface BlobStore {
  list: () => Promise<StoredBlob[]>;
  read: (url: string) => Promise<BlobContent>;
  /** Puts a file at exactly `pathname`, replacing whatever is there. */
  write: (upload: BlobUpload) => Promise<void>;
}

/**
 * The two values below repeat what `@payloadcms/storage-vercel-blob` uses
 * when `src/payload.config.ts` gives it no other: a file restored here has
 * to be indistinguishable from one Payload uploaded. If the config ever
 * passes `access` or `cacheControlMaxAge`, these change with it.
 */
const ACCESS = 'public';
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const FOUND = 200;

/** A folder made in the dashboard is listed as an empty file whose name ends in a slash. */
const isFolder = (pathname: string): boolean => pathname.endsWith('/');

const listAll = async (token: string, cursor?: string): Promise<StoredBlob[]> => {
  const page = await list({ cursor, token });
  const blobs = page.blobs
    .filter(({ pathname }) => !isFolder(pathname))
    .map(({ pathname, size, uploadedAt, url }) => ({
      pathname,
      size,
      uploadedAt: uploadedAt.toISOString(),
      url,
    }));
  return page.hasMore && page.cursor ? [...blobs, ...(await listAll(token, page.cursor))] : blobs;
};

/** The Vercel Blob store `token` gives access to. */
export const vercelBlobStore = (token: string): BlobStore => ({
  list: (): Promise<StoredBlob[]> => listAll(token),
  read: async (url: string): Promise<BlobContent> => {
    // By address, not by pathname: the SDK builds an address from a pathname
    // without encoding it, and a listing's address is already right.
    const result = await get(url, { access: ACCESS, token });
    if (result?.statusCode !== FOUND) {
      throw new Error(`Storage has no file at ${url}.`);
    }
    return {
      bytes: Buffer.from(await new Response(result.stream).arrayBuffer()),
      contentType: result.blob.contentType,
    };
  },
  write: async ({ bytes, contentType, pathname }: BlobUpload): Promise<void> => {
    await put(pathname, bytes, {
      access: ACCESS,
      // The pathname already carries the suffix it was first stored with.
      // Another one would give the file a name no record points at.
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: CACHE_MAX_AGE_SECONDS,
      contentType,
      token,
    });
  },
});
