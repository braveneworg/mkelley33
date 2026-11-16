# "No patched release" is not the same as "unfixable"

**Symptom:** the first pass of the 2026-11-15 sweep reported the vercel
CLI's undici 5.29.0 as unfixable — "there is no 5.x patch" — and left it
accepted in `auditConfig`, where it had sat since August with twelve GHSAs
against it. Asked to try anyway, the fix took one override line and two
commands to prove.

**Root cause:** two true facts were added up into a conclusion neither
supports. undici 5.x has no patched release, and the CLI pins 5.29.0 exactly
even at its latest version. Neither says the CLI _needs_ 5.x. Reading the
one place the CLI imports it showed two names, `Agent` and `ProxyAgent`,
both unchanged in 6.x — and the existing note's warning about an
"API-incompatible major" had never been tested against what the CLI
actually calls.

**Rule:**

- Before accepting an advisory because the patched line is a major away,
  find what the consumer imports from the package (`grep` its `dist/`). A
  narrow, stable surface makes a forced major a reasonable override; a wide
  one does not.
- Then prove it by running the consumer, not by reading changelogs. For the
  CLI: `vercel whoami` and `vercel project ls`, once normally and once with
  `HTTPS_PROXY` pointed at a dead port — the second run failing with
  `fetch failed` shows requests really go through the overridden package.
- The same test cuts the other way. `minimatch@<11.0.1` looked equally
  harmless and broke ESLint's config loading outright:
  `eslint-plugin-import-x` 4.17 imported `makeRe`, which minimatch 11
  removed. `pnpm gate` caught it in seconds; the fix was the plugin release
  that supports 11. A forced major is a hypothesis until the gate has run.
- Say what the proof does not cover, next to the override. Nothing here can
  exercise the upload inside `vercel deploy`, and `pnpm-workspace.yaml` says
  so, with the entry to delete first if the deploy job fails in the CLI.
- When the answer really is no, record why in terms of the consumer:
  `@vercel/python-analysis` is written against zod 3 and nothing in this
  repo can run it, so forcing zod 4 into it stays unproven and is declined.

**History:** 2026-11-15, PR #53.
