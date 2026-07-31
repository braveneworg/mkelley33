# Deploying mkelley33.com

Deploys run from the `deploy` job in `.github/workflows/ci.yml`: every push
to `main` that passes both gates (`ci`, `e2e`) is shipped with
`vercel deploy --prod`, which uploads the source and lets **Vercel** build it.
The runner deliberately does not build the production artifact — see
"Why Vercel builds, not the runner" below. A preflight audits the production
env against
`src/lib/deploy/env-manifest.ts` and fails the deploy — naming names, never
values — if anything required is missing, anything forbidden is set, or a
value with a known shape does not match it.

Vercel's own Git integration would otherwise promote the same commit in
parallel, racing two builds to the production alias and skipping both the
preflight and the `e2e` gate. `vercel.json` turns it off for `main` alone —
`git.deploymentEnabled` — so preview deployments on other branches keep
working. `src/vercel-config.spec.ts` pins that, since deleting the block
would silently restore the double-build.

## Node version

`.nvmrc` and `engines.node` in `package.json` must name the same version, and
that version is capped by Vercel: `nodejs24.x`, the runtime the deployed
functions execute on, tops out at **24.15.0**. The runner uses that Node for
typecheck, lint, unit tests, and the whole `e2e` job, so a newer version there
validates the code against a Node the deployed functions never run — a skew
nothing else would report. `src/node-version.spec.ts` pins the two files
together.

Raise the pin only after confirming Vercel supports the newer version, and
edit both files in the same commit.

## One-time bootstrap

1. `pnpm exec vercel link` locally, once, to create/attach the Vercel
   project; read `orgId` and `projectId` from `.vercel/project.json`
   (git-ignored).
2. Create a token at vercel.com/account/tokens.
3. Set the three GitHub Actions secrets (repo Settings → Secrets and
   variables → Actions):

| GitHub secret       | Value                                   |
| ------------------- | --------------------------------------- |
| `VERCEL_TOKEN`      | the token from step 2                   |
| `VERCEL_ORG_ID`     | `orgId` from `.vercel/project.json`     |
| `VERCEL_PROJECT_ID` | `projectId` from `.vercel/project.json` |

### Pushing the GitHub secrets from the CLI

`gh secret set NAME` with no `--body` prompts for the value and reads it
without echoing, so nothing lands in shell history or `ps`. Repository
secrets are the default level; `--app actions` is explicit about which
consumer gets them.

```bash
gh secret set VERCEL_TOKEN --app actions          # paste at the prompt
gh secret set VERCEL_ORG_ID --app actions
gh secret set VERCEL_PROJECT_ID --app actions
```

The two IDs are not secret and already sit in `.vercel/project.json`, so
they can be piped straight across:

```bash
gh secret set VERCEL_ORG_ID --app actions \
  --body "$(jq -r .orgId .vercel/project.json)"
gh secret set VERCEL_PROJECT_ID --app actions \
  --body "$(jq -r .projectId .vercel/project.json)"
```

Do **not** pass `VERCEL_TOKEN` via `--body` — the value would be captured
in shell history. Verify by name only; `gh` never prints a stored value:

```bash
gh secret list --app actions
```

## Vercel project env (Production)

Runtime config cannot live in GitHub secrets — Vercel functions read it at
runtime from the project env. Set these in Vercel → Project → Settings →
Environment Variables, target **Production**. The preflight fails the deploy
if any is absent or empty.

| Variable                         | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                   | MongoDB Atlas connection string                  |
| `PAYLOAD_SECRET`                 | Payload auth/crypto secret (long random string)  |
| `BLOB_READ_WRITE_TOKEN`          | Vercel Blob store token (media uploads)          |
| `SMTP_HOST`                      | SES SMTP endpoint                                |
| `SMTP_PORT`                      | 587 (STARTTLS; 465 = implicit TLS)               |
| `SMTP_USER`                      | SES SMTP credential user                         |
| `SMTP_PASS`                      | SES SMTP credential password                     |
| `EMAIL_FROM`                     | verified sender address                          |
| `CONTACT_TO`                     | inbox that receives contact submissions          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | real Turnstile site key (public, baked at build) |
| `TURNSTILE_SECRET_KEY`           | real Turnstile secret key                        |

### Pushing the project env from the CLI

The dashboard and `vercel env add` write the same store; the CLI is the
faster path for the tail end of the list. Run from the linked checkout (or
add `--project mkelley33`). With no `--value`, the command prompts for the
value and does not echo it, which is what you want for every secret here.

The real secrets — never readable again once stored, which is the point:

```bash
pnpm exec vercel env add DATABASE_URL production --sensitive
pnpm exec vercel env add PAYLOAD_SECRET production --sensitive
pnpm exec vercel env add SMTP_USER production --sensitive
pnpm exec vercel env add SMTP_PASS production --sensitive
pnpm exec vercel env add TURNSTILE_SECRET_KEY production --sensitive
```

`BLOB_READ_WRITE_TOKEN` is deliberately **not** in that list. Connecting a
Blob store injects it, so create the store with the environment attached
rather than pasting the value:

```bash
pnpm exec vercel blob create-store mkelley33-media \
  --access public --environment production
```

Adding it by hand with `--sensitive` would make it unreadable to
`vercel pull`, and its entry in `DEPLOY_ENV_FORMATS` would then test a
redaction marker and fail every deploy. There is no `connect-store`
subcommand: reattaching an existing store is a dashboard action, and deleting
the project's env var does not sever the connection — which leaves a store
that looks connected while injecting nothing.

The rest are configuration, not credentials. Store them readable so a later
"what is this set to?" is answerable without a rotation:

```bash
pnpm exec vercel env add SMTP_HOST production --no-sensitive
pnpm exec vercel env add SMTP_PORT production --no-sensitive
pnpm exec vercel env add EMAIL_FROM production --no-sensitive
pnpm exec vercel env add CONTACT_TO production --no-sensitive
pnpm exec vercel env add NEXT_PUBLIC_TURNSTILE_SITE_KEY production --no-sensitive
```

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` belongs in that second group by
definition: it ships in the client bundle, so hiding it from the dashboard
protects nothing and only costs you the ability to check it.

Anything a preview deployment also needs takes a comma-separated target —
`pnpm exec vercel env add DATABASE_URL production,preview --sensitive`.
Only Production is audited by the preflight; preview builds fail open the
same way local dev does.

Replacing an existing value — the only way to change a sensitive one —
takes `--force`:

```bash
pnpm exec vercel env add SMTP_PASS production --sensitive --force
```

`--value` exists for non-interactive use and puts the secret in shell
history — reach for a pipe or a file instead when a prompt is not an
option:

```bash
pnpm exec vercel env add SMTP_PASS production --sensitive < smtp-pass.txt
rm smtp-pass.txt
```

`SMTP_PASS` is not the AWS secret access key: SES wants an SMTP password
derived from it, which `scripts/derive-smtp-credentials.ts` computes.
The key is passed as an argument, so it is visible in `ps` for the life of
the command — fine on your own machine, not on a shared host:

```bash
pnpm exec tsx scripts/derive-smtp-credentials.ts "$AWS_SECRET_ACCESS_KEY" us-east-2 \
  | pnpm exec vercel env add SMTP_PASS production --sensitive
```

### Checking what is still missing

`vercel env ls` prints names, targets, and ages. Sensitive variables render
as `Encrypted`; non-sensitive ones show a truncated prefix of the value, so
skim the output before pasting it into a ticket:

```bash
pnpm exec vercel env ls production
```

To run the exact audit CI runs, pull production env to the same git-ignored
path the deploy job uses and hand it to the preflight. It reports missing,
forbidden, and malformed names, never values:

```bash
pnpm exec vercel pull --yes --environment=production
pnpm exec tsx scripts/check-deploy-env.ts .vercel/.env.production.local
```

That file holds real production secrets. It is git-ignored under `.vercel/`
— leave it there, and delete it when you are done.

Forbidden in Production (the audit fails the deploy if set):

| Variable           | Why                                                        |
| ------------------ | ---------------------------------------------------------- |
| `EMAIL_LOG_UNSENT` | E2E-only: logs full email bodies incl. confirm-link tokens |

If the audit names it, drop it:
`pnpm exec vercel env rm EMAIL_LOG_UNSENT production`.

## Why Vercel builds, not the runner

`vercel pull` **cannot read back a variable stored as sensitive**. It writes a
redaction marker in place of the value. The tell is that every sensitive
variable pulls the _same_ short string — on 2026-07-30, `DATABASE_URL`,
`PAYLOAD_SECRET`, `SMTP_PASS`, `SMTP_USER` and `TURNSTILE_SECRET_KEY` all
came back as one identical 11-character value.

Building on the runner (`vercel build --prod` + `vercel deploy --prebuilt`)
therefore compiled production against those markers. The failure looked
nothing like its cause: a `MongoParseError: Invalid scheme` raised inside
`new ConnectionString(...)` — thrown before a socket is opened, so it reads
like a network or IP-allowlist fault and is not one. No Atlas access list can
fix a string the driver never dials.

`vercel deploy --prod` uploads the source and builds on Vercel, where the real
values are injected. It costs build minutes and a slower pipeline. That is the
price of a build that can see its own secrets, and
`src/deploy-workflow.spec.ts` pins it so the faster-looking flow cannot come
back.

**Consequence for the preflight:** for a sensitive variable it can only assert
presence, because it sees a marker rather than a value. Never add a sensitive
name to `DEPLOY_ENV_FORMATS` — the pattern would test the marker and fail
every deploy while the stored value is perfectly good.

Checked for shape as well as presence (`DEPLOY_ENV_FORMATS`) — non-sensitive
variables only:

| Variable                | Must look like                              |
| ----------------------- | ------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_<store id>_<random string>` |

A present-but-unparseable Blob token is worse than a missing one:
`src/payload.config.ts` registers the Blob adapter whenever the var is
truthy, the adapter throws inside `buildConfig`, and Payload never
initializes — so `/admin` fails while the site itself renders. Presence alone
could not see that, which is why the shape is checked too. If you have no
Blob store yet, unset the var rather than parking a placeholder in it; the
config skips the plugin when it is absent.

The app itself fails open when mail/Turnstile config is absent (JSON email
transport, Cloudflare test keys) — right for resilience, wrong as a deploy
default, which is why the manifest hard-requires them. To consciously
soft-launch without one, remove it from `REQUIRED_DEPLOY_ENV` in
`src/lib/deploy/env-manifest.ts` in a reviewed commit.

When the app starts reading a new env var, add it to the manifest — the
spec in `src/lib/deploy/env-manifest.spec.ts` pins the list, so the change
is deliberate and reviewed.
