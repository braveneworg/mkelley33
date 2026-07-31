/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test. The Payload import map must cover the
 * client components of every plugin the config can register — including the
 * env-gated ones that are OFF in the environment that generates the map.
 *
 * `src/payload.config.ts` registers `vercelBlobStorage` only when
 * BLOB_READ_WRITE_TOKEN is truthy, and the plugin registers the client
 * component `VercelBlobClientUploadHandler` even with client uploads
 * disabled. `payload generate:importmap` emits only what the config
 * registers at generation time, so a map generated without the token (local
 * dev, CI, E2E — everywhere but production) silently omits that entry.
 *
 * Observed 2026-07-30: production, the one environment with the token,
 * resolved the component against the stale map, Payload logged
 * "PayloadComponent not found in importMap" server-side only, and every
 * /admin route rendered a blank page with zero browser errors. No other
 * environment could reproduce it, because no other environment enables the
 * plugin.
 */

const importMap = (): string => readFileSync('src/app/(payload)/admin/importMap.js', 'utf8');

const payloadConfig = (): string => readFileSync('src/payload.config.ts', 'utf8');

describe('payload import map', () => {
  it('guards a config that still registers vercel-blob storage', () => {
    expect(payloadConfig()).toMatch(/vercelBlobStorage/);
  });

  it('maps the vercel-blob client upload handler', () => {
    expect(importMap()).toMatch(
      /"@payloadcms\/storage-vercel-blob\/client#VercelBlobClientUploadHandler":/
    );
  });
});
