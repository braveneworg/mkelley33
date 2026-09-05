# A presence-only preflight cannot see a test secret

**Symptom:** the Cloudflare Turnstile dashboard showed "Siteverify isn't
being called for this widget" on `mkelley33-turnstile`, with challenges
solved and **zero** siteverify requests — while every production form
submission the owner tried went through. The deploy preflight was green, the
env audit reported every required name present, and the code path that calls
siteverify was verified correct by reading it.

**Root cause:** the `TURNSTILE_SECRET_KEY` stored in Vercel Production was
Cloudflare's always-pass test secret, set 2026-07-29 and never changed.
Siteverify _was_ called on every submission; a test secret makes it answer
`success:true` to any token and attribute the call to no widget. The spam
gate accepted everything for 38 days.

Three layers each did their job and none could catch it:

- The preflight asserts **presence** for a sensitive variable, because
  `vercel pull` returns a redaction marker in place of the value
  ([vercel-pull-redacts-sensitive-env](vercel-pull-redacts-sensitive-env.md)).
  A test secret is present.
- `verify.ts` honored any explicitly configured secret, by design: the E2E
  harness pins the same test secret into a `NODE_ENV=production` build, so
  "configured beats production" was the rule that kept the suite hermetic.
- `verify.ts` discarded Cloudflare's `error-codes`, so even a wrong-but-real
  secret (`invalid-input-secret`) would have looked like a bot.

**Rule:**

- A sensitive variable the preflight can only see as _present_ needs a
  **runtime** guard against the values that are known to be wrong. For
  Turnstile that is Cloudflare's three published test secrets. Refuse them
  where they can only be a mistake, loudly, so the failure is every submission
  rejected with a log line naming the cause — not every submission accepted.
- Key that guard off `VERCEL_ENV === 'production'`, never `NODE_ENV`: the E2E
  harness and preview deployments are production builds where a test secret
  is legitimate. When the code starts reading a new env var, the harness pins
  it (`src/lib/e2e/harness-config.ts`) — `VERCEL_ENV` is pinned to `''` for
  exactly this reason.
- Log the reason a verification failed (`error-codes`), never the inputs
  (token, secret). A boolean contract to the caller is right; a boolean
  contract to the operator is what hid this.
- The only end-to-end check of a stored secret is the provider's own
  counter. After any change to `TURNSTILE_SECRET_KEY`, submit one real form
  and watch the widget's Token validation panel move. "Submissions succeed" is
  not evidence the gate works — with a test secret, that is the symptom.
- "An explicit value is a deliberate choice" is only true if something
  records the choice. Nothing did; the sentence claiming it in
  `docs/deploy.md` was deleted with this fix.

**Diagnosis that worked:** the code was right, so the question became what
the dashboard could and could not see. The site key in the live bundle was
matched to the widget by prefix (public value, classified rather than
printed). Then two facts only the owner had — submissions succeed, siteverify
count is zero — left exactly one value class for the secret.

**History:** 2026-09-05, `fix/turnstile-siteverify`. The fix is a runtime
guard in `src/lib/turnstile/verify.ts` plus the owner replacing the stored
value and redeploying; the code cannot fix the value.
