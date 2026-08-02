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

const packageJson = (): string => readFileSync('package.json', 'utf8');

const generatorScript = (): string => readFileSync('scripts/generate-importmap.mjs', 'utf8');

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

/**
 * The upstream `payload generate:importmap` CLI dies with
 * ERR_REQUIRE_ASYNC_MODULE (payloadcms/payload#16378), so the script must go
 * through the same fallback shape as `generate:types`: the tsx CLI calling
 * the supported `generateImportMap` export directly. And per the lesson
 * above, the generator must force the env-gated blob plugin ON before the
 * config loads, so every regeneration emits the union map — never the
 * plugin-off subset that blanked production's /admin.
 */
describe('import map generator', () => {
  it('routes generate:importmap through the tsx fallback script', () => {
    expect(packageJson()).toMatch(/"generate:importmap": "tsx scripts\/generate-importmap\.mjs"/);
  });

  it('calls the supported payload export instead of the broken CLI', () => {
    expect(generatorScript()).toMatch(/import \{ generateImportMap \} from 'payload'/);
  });

  it('forces the env-gated blob plugin on before the config loads', () => {
    expect(generatorScript()).toMatch(
      /BLOB_READ_WRITE_TOKEN \|\|=[\s\S]*import\('\.\.\/src\/payload\.config\.ts'\)/
    );
  });
});
