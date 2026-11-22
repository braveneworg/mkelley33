/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Connection strings for the throwaway Mongo container behind
 * `pnpm build:ci` and `pnpm e2e`.
 */

const LOOPBACK_ADDRESS = /^127\.0\.0\.1:\d+$/;

/**
 * The connection string for the address `docker compose port` printed, or
 * null when its output holds anything but exactly one loopback address. The
 * capture carries stderr too, so other lines are skipped over; an address
 * that is not loopback is not skipped into acceptance — the compose file
 * publishes Mongo on loopback only, so there is then no match at all.
 */
export const publishedMongoUrl = (output: string): null | string => {
  const addresses = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => LOOPBACK_ADDRESS.test(line));
  const [address] = addresses;
  return addresses.length === 1 && address !== undefined ? `mongodb://${address}` : null;
};

/**
 * A database on the server. One Mongo container serves a whole run, so "a
 * fresh database" for a retry is a new name, not a new server.
 */
export const databaseUrl = (mongoUrl: string, database: string): string =>
  `${mongoUrl}/${database}`;
