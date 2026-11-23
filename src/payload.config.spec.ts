/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

/**
 * Pins where a malformed `BLOB_READ_WRITE_TOKEN` is caught.
 *
 * The deploy preflight cannot judge the token: it is stored as sensitive, so
 * `vercel pull` hands the preflight a redaction marker (docs/deploy.md). The
 * check therefore lives where the real value is visible — the build on
 * Vercel. The Blob adapter refuses a token it cannot parse while the config
 * is being built, the config never resolves, and every page that reads Owner
 * content then fails to render (docs/adr/0001), which fails the build and
 * leaves the current site up.
 *
 * This spec holds the first link of that chain. If an upgrade of the adapter
 * stops refusing, a malformed token would build cleanly and break uploads in
 * production instead, and the guard has to be written here.
 */

// Assembled from parts so no token-shaped literal ever lands in the repo for
// gitleaks (or a human skimming the diff) to mistake for a live credential.
const wellFormedBlobToken = ['vercel', 'blob', 'rw', 'ExampleStore123', 'notARealSecret'].join('_');

/** Evaluating the whole config cold is slow under coverage; the default is 5s. */
const CONFIG_LOAD_TIMEOUT_MS = 30_000;

const loadConfig = async (blobToken: string): Promise<unknown> => {
  vi.resetModules();
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', blobToken);
  const { default: config } = await import('@payload-config');
  return config;
};

describe('payload config with a Blob token', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it(
    'builds when the token is well formed',
    async () => {
      await expect(loadConfig(wellFormedBlobToken)).resolves.toBeDefined();
    },
    CONFIG_LOAD_TIMEOUT_MS
  );

  it(
    'refuses to build when the token is malformed',
    async () => {
      await expect(loadConfig('not-a-blob-token')).rejects.toThrow(
        'Invalid token format for Vercel Blob adapter'
      );
    },
    CONFIG_LOAD_TIMEOUT_MS
  );
});
