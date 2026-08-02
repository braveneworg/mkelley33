#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Fallback for `payload generate:importmap`.
 *
 * The upstream CLI (node_modules/payload/dist/bin/index.js -> bin.js) fails on
 * this Node 24 + tsx combo with:
 *
 *   Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph
 *   with top-level await. Use import() instead.
 *
 * Same known upstream issue as `generate:types` (payloadcms/payload#16378):
 * the tsx-powered CLI bin synchronously require()s payload.config.ts, whose
 * graph reaches @payloadcms/richtext-lexical — ESM with top-level await —
 * which Node's loader rejects. `generateImportMap` is a supported public
 * export of `payload` (node_modules/payload/dist/index.js re-exports it from
 * `./bin/generateImportMap/index.js`), so this script calls it directly under
 * the tsx CLI, exactly like scripts/generate-types.mjs — see that file for
 * why the tsx CLI works where `node --import tsx/esm` does not:
 *
 *   pnpm exec tsx scripts/generate-importmap.mjs
 */
import { generateImportMap } from 'payload';

// The vercel-blob plugin is env-gated in src/payload.config.ts, and the CLI
// emits entries only for what the config registers at generation time — a map
// generated without the token omits the plugin's client component and blanks
// production's /admin (docs/lessons/deploy/env-gated-plugin-stale-import-map.md).
// Force the plugin ON before the config loads so every regeneration emits the
// union map across environments; generation never dials the store, and a real
// token in the environment still wins. The plugin rejects tokens that do not
// match /^vercel_blob_rw_<store_id>_<random_string>$/, so the placeholder has
// to wear that shape.
process.env.BLOB_READ_WRITE_TOKEN ||= 'vercel_blob_rw_localgen_placeholder'; // fake, format-only — gitleaks:allow

const configModule = await import('../src/payload.config.ts');
const config = await configModule.default;

await generateImportMap(config);
