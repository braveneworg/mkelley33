#!/usr/bin/env node
/**
 * Fallback for `payload generate:types`.
 *
 * The upstream CLI (node_modules/payload/dist/bin/index.js -> bin.js) fails on this
 * Node 24 + tsx combo with:
 *
 *   Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph
 *   with top-level await. Use import() instead.
 *
 * This is a known upstream issue (payloadcms/payload#16378): the tsx-powered CLI
 * bin ends up doing a synchronous require() of an ESM module
 * (@payloadcms/richtext-lexical) that has top-level await, which Node's loader
 * rejects.
 *
 * `generateTypes` is a supported public export of `payload/node`
 * (node_modules/payload/dist/exports/node.js re-exports it from
 * `../bin/generateTypes.js`), and `buildConfig` (used in src/payload.config.ts)
 * already returns a fully sanitized config. So we can call `generateTypes`
 * directly here, sidestepping the broken CLI bin entirely. No live DB
 * connection is required — generateTypes only reads the sanitized config
 * shape to build a JSON schema and compile it to TypeScript.
 *
 * Run with the `tsx` CLI (added as a pinned devDependency: 4.22.4, matching
 * the version payload already resolves as a transitive peer dependency):
 *
 *   pnpm exec tsx scripts/generate-types.mjs
 *
 * `node --import tsx/esm scripts/generate-types.mjs` (the brief's first
 * suggestion) reproduces the exact same ERR_REQUIRE_ASYNC_MODULE failure as
 * the CLI, because this project's package.json has no `"type": "module"`,
 * so tsx's --import loader hook treats payload.config.ts's ambient module
 * type ambiguously and ends up synchronously require()-ing
 * @payloadcms/richtext-lexical (an ESM package with top-level await) during
 * transform, same as the broken bin. The `tsx` CLI sets up Node's loader
 * hooks differently (see tsx's dist/cli.mjs) and does not hit this path —
 * confirmed working here. Plain `node` (no tsx at all) cannot load this
 * script either way, since payload.config.ts needs TS + the `@/...`
 * path-aliased imports resolved.
 */
import { generateTypes } from 'payload/node';

const configModule = await import('../src/payload.config.ts');
const config = await configModule.default;

await generateTypes(config);
