# An env-gated plugin makes the generated import map env-dependent

**Symptom:** every `/admin` route on production rendered a blank page — HTTP
200, complete HTML and RSC payload, all chunks loading, providers hydrating,
zero browser console errors. Only the Vercel function logs said anything:

```text
getFromImportMap: PayloadComponent not found in importMap {
  key: '@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler',
  ...
} You may need to run the `payload generate:importmap` command ...
```

**Root cause:** `src/payload.config.ts` registers `vercelBlobStorage` only
when `BLOB_READ_WRITE_TOKEN` is truthy, and the plugin registers its
`VercelBlobClientUploadHandler` client component even with client uploads
disabled. `payload generate:importmap` emits entries only for what the config
registers **at generation time**, and the map was generated (and committed)
in an environment without the token. Production is the only environment that
sets the token, so it was the only environment where Payload looked up the
missing entry — and Payload's failure mode is a server-side log plus a
silently empty admin tree, not an error.

The diagnosis resisted the obvious env-diff because the failure needed BOTH
halves at once: the plugin ON (production only) and the stale map (every
environment). A hermetic local production build was fine until the same
fake-format token was exported, at which point it went blank identically.

**Rule:**

- When a config input is env-gated, every **generated artifact derived from
  the config** silently becomes env-dependent too. Generate the import map
  with all env-gated plugins forced ON (any truthy `BLOB_READ_WRITE_TOKEN`
  works — generation never dials the store), so the committed map is the
  union across environments. Extra entries are harmless; missing ones blank
  the admin.
- `src/payload-import-map.spec.ts` pins the blob handler entry, verified red
  against the stale map. Extend it when the config gains another env-gated
  plugin.
- A blank Payload admin with a clean browser console means a server-side
  component-resolution failure — read the function logs first, not the
  client.

**Also:** `pnpm run generate:importmap` currently dies with
`ERR_REQUIRE_ASYNC_MODULE` — the payload CLI `require()`s the lexical ESM
graph, which has top-level await. The fix entry was hand-authored in the
generator's exact output shape. Un-breaking the generator (likely a Payload
bump) is open work; until then, regenerating the map means hand-editing it.

**History:** 2026-07-30, found diagnosing the blank production admin, the
first time `/admin` was opened after the Blob token landed. See
[vercel-pull-redacts-sensitive-env](vercel-pull-redacts-sensitive-env.md) for
the earlier way this same variable broke the admin.
