# `vercel pull` redacts sensitive values, and a runner-side build ships the marker

**Symptom:** the production build died with

```text
MongoParseError: Invalid scheme, expected connection string to start with
  "mongodb://" or "mongodb+srv://"
… payloadInitError: true   (×7)
```

while `DATABASE_URL` in the Vercel production env was set correctly. The
deploy job was green, the env preflight reported `deploy env audit passed`,
and `/admin` was down.

**Root cause:** a variable stored as **sensitive** cannot be read back.
`vercel pull` writes a redaction marker in its place. The `deploy` job then
ran `vercel build --prod` on the runner and compiled production against those
markers, and `vercel deploy --prebuilt` shipped that build.

The error pointed away from the cause twice over. `new ConnectionString(...)`
throws _before_ opening a socket, so it reads as a network or IP-allowlist
problem — it is not one, and no Atlas access list can fix a string the driver
never dials. And the value it rejected was never the one in the dashboard.

**The tell:** every sensitive variable pulls the _same_ value. Compare
lengths, or hash them — never print them:

```sh
# names + lengths only; five distinct secrets cannot share one length
awk -F= '/^[A-Z_]+=/ {print $1, length($0) - length($1) - 1}' <pulled file>
```

On 2026-07-30 `DATABASE_URL`, `PAYLOAD_SECRET`, `SMTP_PASS`, `SMTP_USER` and
`TURNSTILE_SECRET_KEY` were byte-identical at 11 characters.
`BLOB_READ_WRITE_TOKEN` pulled a real 62-character value because the Blob
store connection created it, not `vercel env add --sensitive`.

**Rule:**

- Let **Vercel** build. `vercel deploy --prod` uploads source and builds where
  the real values are injected. `src/deploy-workflow.spec.ts` pins this; the
  `--prebuilt` flow cannot come back silently.
- The preflight can assert **presence only** for a sensitive name. Never add
  one to `DEPLOY_ENV_FORMATS` — the pattern tests the marker and fails every
  deploy against a perfectly good stored value. This was nearly shipped: a
  `DATABASE_URL` scheme check passed its unit tests and would have broken
  production deploys on the first run.
- A green preflight means "the names are set", never "the values are usable".
- Diagnose a suspect secret by **shape, not content** — length, first/last
  character class, a truncated hash. That is enough to identify a placeholder,
  a quoted paste, or stray whitespace without the value entering a transcript.

**Cost:** two wrong diagnoses given to the user before the marker was spotted
— first that the Blob token was the only fault, then that their `DATABASE_URL`
was malformed and should be re-added. It was correct all along.

**History:** 2026-07-30. See
[a-floor-cannot-express-a-ceiling](../testing/a-floor-cannot-express-a-ceiling.md)
for the other place a deploy-shaped invariant hid in two unlinked files.
