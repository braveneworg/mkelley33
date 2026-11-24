/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The pictures one record shows, uploaded while the fill creates it. A Page
 * or a post is saved after its pictures, because it stores the id of each
 * upload — so a save that fails leaves uploads nothing points at.
 */

import path from 'node:path';

import type { PictureSeed } from '@/lib/seed/seed-values';

import type { Payload } from 'payload';

const MEDIA = 'media';

/** Uploads one of the Seed's pictures and resolves to the id of the upload. */
export type UploadPicture = (picture: PictureSeed) => Promise<string>;

/**
 * Tidies up after a failed save: removes the pictures uploaded for it, so
 * the next run does not upload a second copy beside them.
 *
 * It must not delete an upload that is in use — a save can fail after it
 * has written the record, because the version history is saved second — and
 * it must not throw: the failure worth reporting is the one that stopped
 * the Seed. See `docs/lessons/seed/a-cleanup-must-not-outrank-the-failure.md`.
 */
const removeUnusedUploads = async (
  payload: Payload,
  wasSaved: () => Promise<boolean>,
  uploads: readonly string[]
): Promise<void> => {
  try {
    if (await wasSaved()) {
      return;
    }
    for (const id of uploads) {
      await payload.delete({ collection: MEDIA, id });
    }
  } catch {
    // Best effort — see above.
  }
};

/**
 * Runs `save` with a way to upload the Seed's pictures, and resolves to what
 * it saved and the ids of the uploads it made. When `save` fails the uploads
 * are removed again, unless `wasSaved` finds the record was written after
 * all.
 */
export const withPictures = async <T>(
  payload: Payload,
  directory: string,
  wasSaved: () => Promise<boolean>,
  save: (upload: UploadPicture) => Promise<T>
): Promise<{ saved: T; uploads: string[] }> => {
  const uploads: string[] = [];
  const upload: UploadPicture = async ({ alt, file }) => {
    const { id } = await payload.create({
      collection: MEDIA,
      data: { alt },
      filePath: path.resolve(directory, file),
    });
    uploads.push(id);
    return id;
  };
  try {
    return { saved: await save(upload), uploads };
  } catch (error) {
    await removeUnusedUploads(payload, wasSaved, uploads);
    throw error;
  }
};
