/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Reads the file behind an upload, wherever that environment keeps it. It
 * follows what Payload's own file route does: the storage plugin's handler
 * when there is one (Vercel Blob on the live site), and otherwise the
 * collection's directory on this machine's disk.
 *
 * Capture is the only caller. A file it cannot read is a failure, never a
 * gap: a Seed written without a picture the site shows would upload nothing
 * in its place.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createLocalReq } from 'payload';

import type { Payload, SanitizedCollectionConfig } from 'payload';

/** An upload record, as far as finding its file needs it. */
export interface UploadRecord {
  filename?: null | string;
  id: string;
}

const OK = 200;

const fromDisk = async (staticDir: string, filename: string): Promise<Buffer> => {
  const directory = path.resolve(staticDir);
  const file = path.resolve(directory, filename);
  if (!file.startsWith(directory + path.sep)) {
    throw new Error(`The upload ${filename} has a name that leaves its directory.`);
  }
  try {
    return await readFile(file);
  } catch {
    throw new Error(
      `The upload ${filename} is not on this machine. If this is the live database, ` +
        'set BLOB_READ_WRITE_TOKEN so that uploads can be read from storage.'
    );
  }
};

/** The bytes of the file behind `doc`, an upload in `collection`. */
export const readUpload = async (
  payload: Payload,
  { slug, upload }: SanitizedCollectionConfig,
  doc: UploadRecord
): Promise<Buffer> => {
  const { filename } = doc;
  if (!filename) {
    throw new Error(`The upload ${doc.id} in ${slug} has no file.`);
  }
  // Payload's own default: a directory named after the collection.
  const staticDir = upload.staticDir ?? slug;
  const handlers = upload.handlers ?? [];
  if (handlers.length === 0) {
    return fromDisk(staticDir, filename);
  }
  const req = await createLocalReq({}, payload);
  for (const handler of handlers) {
    const response = await handler(req, {
      doc,
      headers: new Headers(),
      params: { collection: slug, filename },
    });
    if (response instanceof Response) {
      if (response.status !== OK) {
        throw new Error(`Storage answered ${String(response.status)} for the upload ${filename}.`);
      }
      return Buffer.from(await response.arrayBuffer());
    }
  }
  // No handler answered, which is Payload's cue to look on disk.
  return fromDisk(staticDir, filename);
};
