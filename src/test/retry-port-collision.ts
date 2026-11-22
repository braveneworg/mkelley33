/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * mongodb-memory-server finds a free port and only then starts mongod on it.
 * Between the check and the bind another process can take the port — most
 * often a second spec file's memory server, since the integration specs run
 * in parallel workers. mongod then exits with "address already in use" and
 * the library rejects with `Port "<n>" already in use`. Nothing is wrong with
 * the spec, so the start is simply made again: a new attempt picks a new port.
 */
const PORT_COLLISION = /already in use/i;

/** Losing the race three times running means something else is wrong. */
export const PORT_COLLISION_ATTEMPTS = 3;

const isPortCollision = (error: unknown): boolean =>
  error instanceof Error && PORT_COLLISION.test(error.message);

/**
 * Runs `start`, repeating it only when it failed because its port was taken.
 * Every other failure is rethrown at once, so a missing binary or a bad
 * option is not hidden behind retries.
 */
export const retryOnPortCollision = async <T>(start: () => Promise<T>): Promise<T> => {
  for (let attempt = 1; attempt < PORT_COLLISION_ATTEMPTS; attempt += 1) {
    try {
      return await start();
    } catch (error) {
      if (!isPortCollision(error)) {
        throw error;
      }
    }
  }
  return start();
};
