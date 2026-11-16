# The trace file shows what a function will carry — no deploy needed

**Symptom:** sharp sat pinned at 0.34 for ten weeks behind a note saying the
pin could lift only once sharp 0.35 was "confirmed traceable on Vercel AND
/admin verified on a deploy". The first Dependabot sweep read that as "needs
a deploy to find out" and left two high-severity sharp alerts open, plus an
override holding next's own sharp back to match.

**Root cause:** the question had a local answer all along. The outage was a
tracing failure — next's output file tracing shipped sharp's native addon
without the `libvips-cpp` shared library it loads — and next writes its
tracing decisions to disk on every build: one `*.nft.json` per server entry
under `.next/`, listing every file that entry's function bundle will contain.
After `pnpm build` on next 16.4.6 with sharp 0.35.5, 23 of 30 traces listed
the addon and every one of them also listed
`@img/sharp-libvips-<platform>/lib/libvips-cpp.*`. That is the same evidence
a deploy would have given, minus the outage if the answer had been no.

**Rule:**

- When the fear is "will file X reach the function bundle", read
  `.next/**/*.nft.json` after a local build before reaching for a deploy.
  The platform package name differs (`darwin-arm64` here, `linux-x64` on the
  runner and on Vercel) but the tracing logic is the same code.
- A check that can be read off a build artifact belongs in `build:ci`, not
  in a note asking someone to look at production. `scripts/ci-build.ts` now
  fails the build when any trace carries sharp's addon without its libvips
  (`src/lib/deploy/sharp-trace.ts`), on Linux, before the deploy job runs.
- It still does not replace looking at `/admin` after the first deploy of a
  sharp change: the trace proves the file is listed, not that the lambda
  loads it.

**Also:** the upstream issue (lovell/sharp#4567) had been closed for ten
weeks with the cause named — Turbopack in next 16.2, fixed in 16.3. A pin
that cites an issue should be re-read against that issue whenever the
package it blames is bumped; here the same PR that moved next past the fix
was about to keep working around it.

**History:** 2026-11-15, PR #53.
