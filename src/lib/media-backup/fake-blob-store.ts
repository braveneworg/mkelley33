/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A blob store held in memory, for the specs of the backup and the restore.
 * It keeps what a real store keeps — bytes and a content type under a
 * pathname — and answers the same three questions, so those specs exercise
 * the real code against real files on disk without a network.
 */

import type { BlobContent, BlobStore, BlobUpload, StoredBlob } from '@/lib/media-backup/blob-store';

const STORE_URL = 'https://fakestore.public.blob.vercel-storage.com';
const UPLOADED_AT = '2026-11-22T08:00:00.000Z';

export interface FakeBlobStore extends BlobStore {
  /** What the store holds now, by pathname. */
  readonly contents: Map<string, BlobContent>;
}

export const fakeFile = (text: string, contentType = 'image/png'): BlobContent => ({
  bytes: Buffer.from(text),
  contentType,
});

export const fakeBlobStore = (files: Record<string, BlobContent> = {}): FakeBlobStore => {
  const contents = new Map(Object.entries(files));
  return {
    contents,
    list: (): Promise<StoredBlob[]> =>
      Promise.resolve(
        [...contents].map(([pathname, { bytes }]) => ({
          pathname,
          size: bytes.length,
          uploadedAt: UPLOADED_AT,
          url: `${STORE_URL}/${pathname}`,
        }))
      ),
    read: (url: string): Promise<BlobContent> => {
      const content = contents.get(url.replace(`${STORE_URL}/`, ''));
      return content
        ? Promise.resolve(content)
        : Promise.reject(new Error(`Storage has no file at ${url}.`));
    },
    write: ({ pathname, ...content }: BlobUpload): Promise<void> => {
      contents.set(pathname, content);
      return Promise.resolve();
    },
  };
};
