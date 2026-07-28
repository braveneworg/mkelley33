# Deploying mkelley33.com

Deploys run from the `deploy` job in `.github/workflows/ci.yml`: every push
to `main` that passes both gates (`ci`, `e2e`) is built with the Vercel CLI
and promoted to production. A preflight audits the production env against
`src/lib/deploy/env-manifest.ts` and fails the deploy — naming names, never
values — if anything required is missing or anything forbidden is set.

Vercel's own Git integration would otherwise promote the same commit in
parallel, racing two builds to the production alias and skipping both the
preflight and the `e2e` gate. `vercel.json` turns it off for `main` alone —
`git.deploymentEnabled` — so preview deployments on other branches keep
working. `src/vercel-config.spec.ts` pins that, since deleting the block
would silently restore the double-build.

## Node version

`.nvmrc` and `engines.node` in `package.json` must name the same version, and
that version is capped by Vercel: `nodejs24.x`, the runtime the deployed
functions execute on, tops out at **24.15.0**. The `deploy` job runs
`vercel build --prod` on the runner's `.nvmrc` Node, so a newer version there
compiles the artifact against a Node production never runs — a skew nothing
else would report. `src/node-version.spec.ts` pins the two files together.

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

Forbidden in Production (the audit fails the deploy if set):

| Variable           | Why                                                        |
| ------------------ | ---------------------------------------------------------- |
| `EMAIL_LOG_UNSENT` | E2E-only: logs full email bodies incl. confirm-link tokens |

The app itself fails open when mail/Turnstile config is absent (JSON email
transport, Cloudflare test keys) — right for resilience, wrong as a deploy
default, which is why the manifest hard-requires them. To consciously
soft-launch without one, remove it from `REQUIRED_DEPLOY_ENV` in
`src/lib/deploy/env-manifest.ts` in a reviewed commit.

When the app starts reading a new env var, add it to the manifest — the
spec in `src/lib/deploy/env-manifest.spec.ts` pins the list, so the change
is deliberate and reviewed.
