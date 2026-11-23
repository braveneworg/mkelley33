# Deploying mkelley33.com

Deploys run from the `deploy` job in `.github/workflows/ci.yml`: every push
to `main` that passes both gates (`ci`, `e2e`) is shipped with
`vercel deploy --prod`, which uploads the source and lets **Vercel** build it.
The runner deliberately does not build the production artifact — see
"Why Vercel builds, not the runner" below. A preflight audits the production
env against
`src/lib/deploy/env-manifest.ts` and fails the deploy — naming names, never
values — if anything required is missing or anything forbidden is set.

Vercel's own Git integration would otherwise promote the same commit in
parallel, racing two builds to the production alias and skipping both the
preflight and the `e2e` gate. `vercel.json` turns it off for every branch —
`git.deploymentEnabled` is `false` — so nothing deploys on a push but this
job. `src/vercel-config.spec.ts` pins that, since deleting the block would
silently restore the double-build.

That also means a pull request gets no preview deployment and no `Vercel`
status: the owner decided on 2026-11-23 that the `ci` and `e2e` jobs are the
only gates a pull request is judged by. A preview can still be made by hand
with `pnpm exec vercel deploy`, and the notes on preview below apply to one
made that way.

## Node version

`mise.toml` and `engines.node` in `package.json` must name the same version;
`src/node-version.spec.ts` pins the two together. `mise.toml` is the only
version file — `mise install` reads it locally and `actions/setup-node` reads
it in every CI job — and the same spec fails if an `.nvmrc`,
`.node-version` or `.tool-versions` reappears beside it. The same spec holds
`@types/node` to the major `engines.node` names, because a dependency sweep
otherwise carries it to the newest Node's types and the typecheck starts
accepting APIs the installed Node does not have.

The version is capped by Vercel's build image. Vercel lets a project choose
only the major (`24.x`) and rolls patch releases out on its own schedule, and
its install enforces this floor exactly as the runner's does: `engineStrict`
in `pnpm-workspace.yaml` turns an unmet `engines.node` into a failed install
(`ERR_PNPM_UNSUPPORTED_ENGINE`), for this package and for every dependency.
A floor above the image therefore fails every Vercel build. The runner uses
the pinned Node for typecheck, lint, unit tests, and the whole `e2e` job, so
a newer version there would also validate the code against a Node the deploy
never builds on.

The pin is **24.22.1**, raised from 24.15.0 on 2026-11-15. It is the Node 24
release that fixed CVE-2026-111497 (2026-10-21) and the floor `payload` 3.92
and later declare (`^22.23.4 || >=24.22.1`), which is what forced the move.
The evidence that Vercel's image has it: Vercel's security bulletin says every
new deployment uses a patched Node from 2026-10-28, and a build there was
reported on 24.22.1 on 2026-10-30. That is a public report, not this
project's own build log — the first deploy after the bump is the real proof.

The functions' Node is a separate thing and can trail the build image: the
same report saw `process.version` at v24.21.0 at request time. Nothing checks
engines at request time, so that does not fail a deploy, but the pin is a
statement about the build, not about the function runtime.

Raise the pin only after confirming Vercel's build image has reached the
newer version, and edit both files in the same commit.

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
pnpm exec vercel env add BLOB_READ_WRITE_TOKEN production --sensitive
```

`BLOB_READ_WRITE_TOKEN` is the read-write token of the Blob store, which was
created with the environment attached:

```bash
pnpm exec vercel blob create-store mkelley33-media \
  --access public --environment production
```

That connection stores the token readable. The owner made it sensitive on
2026-11-23, so it is in the list above and `vercel pull` returns a redaction
marker for it like the rest; the preflight checks that it is set and nothing
more. There is no `connect-store` subcommand: reattaching an existing store
is a dashboard action, and deleting the project's env var does not sever the
connection — which leaves a store that looks connected while injecting
nothing.

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
Only Production is audited by the preflight, so a preview missing a variable
degrades the same way local dev does — with two exceptions.

`DATABASE_URL` is one. Every page reads the Site settings and nothing falls
back to source
([ADR 0001](adr/0001-the-database-is-the-only-copy-of-owner-content.md)), so
a preview build fails when it has no database, or when the database it has
holds no published Site settings. Whichever database preview builds against
has to be seeded like the live one — see "Seed before a deploy that needs
new records" below.

`TURNSTILE_SECRET_KEY` is the other. A preview build still runs with
`NODE_ENV=production` (Vercel sets `VERCEL_ENV=preview`, not `NODE_ENV`), so
it fails **closed** there too: give preview the `production,preview` target
for that variable, or accept that every contact and newsletter submission on
a preview URL is rejected.

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
path the deploy job uses and hand it to the preflight. It reports missing
and forbidden names, never values:

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

## Seed before a deploy that needs new records

The database is the only copy of Owner content
([ADR 0001](adr/0001-the-database-is-the-only-copy-of-owner-content.md)).
Code that reads a record the live database does not have yet fails its
build, and Vercel then keeps serving the current site. So the order is:
**seed first, then merge.**

`pnpm seed` fills the database `DATABASE_URL` names from the Seed in `seed/`.
It is fill-only — it creates what is missing and never changes what the
owner has written — so running it against the live site is safe, and running
it twice does nothing the second time. Run it from the branch that is about
to merge, with the production values in the environment, and read its last
line: it lists what it created and what it kept.

"Missing" reaches one level into Site settings. A menu is a field added
after the live record was first saved, so the record can exist and never
have had one; the Seed adds that field and nothing else. It will not publish
on your behalf: if Site settings are unpublished, or hold changes you have
saved and not published, it leaves the menus out and prints
`seed: skipped site settings header menu (…)` with the reason. Publish or
discard the changes and run it again.

The Seed uploads the Resume and the pictures its Pages show, so
`BLOB_READ_WRITE_TOKEN` has to be in the environment as well as
`DATABASE_URL`. Without it an upload lands on the disk of the machine
running the Seed while its record lands in the live database, and the site
answers 502 at the Resume's address or shows a broken picture. The command
warns when it uploaded to disk and says how many files; the repair is to
upload each again in the admin — the Resume under Site settings, a picture
in the Block that shows it.

Look before you fill. `pnpm seed:check` takes the same environment, reads
the database, and writes nothing. It lists what a fill would create and what
it would keep, and says what state the Site settings and their Resume are
in:

```text
seed check — nothing was written
  would create: [page blog, page contact, …, site settings header menu, site settings footer menu]
  would keep: [site settings, service ai-enablement, …]
  site settings: published
  resume: attached
  resume uploads nothing points at: 0
```

A line reading `the menus would wait: …` means a fill would skip the menus,
for the reason it gives.

**If a fill fails part-way**, run `pnpm seed:check` again before anything
else. A fill uploads a file and then saves the record that points at it, so
a failure between the two can leave an upload nothing points at. It is
private or unused, and harmless, and can be deleted in the admin under
Resume files or Media once the site is deployed. Running the fill again is
always safe: it will create whatever is still missing and leave the rest
alone.

Only the owner can do any of this. It needs the production database and blob
storage credentials, which no agent may read.

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

**Consequence for the preflight:** it asserts presence and nothing else. For
a sensitive variable it sees a marker rather than a value, and it cannot
tell the two apart, so a check on what a value looks like fails every deploy
while the stored value is perfectly good. `BLOB_READ_WRITE_TOKEN` had such a
check while it was stored readable; it stopped the deploy on 2026-11-23, the
day the token became sensitive, and was removed.

**Where the Blob token's shape is checked instead:** in the build on Vercel,
which has the real value. `src/payload.config.ts` registers the Blob adapter
whenever the var is truthy, and the adapter throws on a token that is not
shaped like `vercel_blob_rw_<store id>_<random string>` while the config is
being built. Payload then never initializes, every page that reads Owner
content fails to render
([ADR 0001](adr/0001-the-database-is-the-only-copy-of-owner-content.md)),
the build fails, and Vercel keeps serving the current site. The `deploy` job
goes red at its last step rather than at the preflight, and the reason is in
Vercel's build log, not the runner's. `src/payload.config.spec.ts` pins the
adapter's refusal. If you have no Blob store yet, unset the var rather than
parking a placeholder in it; the config skips the plugin when it is absent.

The app degrades rather than crashing when config is absent — the JSON email
transport stands in for SMTP, the Cloudflare test site key for a real one —
which is right for resilience and wrong as a deploy default, and is why the
manifest hard-requires them. To consciously soft-launch without one, remove
it from `REQUIRED_DEPLOY_ENV` in `src/lib/deploy/env-manifest.ts` in a
reviewed commit.

`TURNSTILE_SECRET_KEY` is the exception: `src/lib/turnstile/verify.ts` fails
**closed** when it is unset and `NODE_ENV` is `production`, so removing it
from the manifest does not soft-launch the spam gate — it rejects every
contact, newsletter, and comment submission. It also fails closed when
`VERCEL_ENV` is `production` and the value is one of Cloudflare's published
test secrets: a test secret makes siteverify accept every token, and the
preflight cannot tell it from a real one because a sensitive value pulls as a
redaction marker. Production ran on the always-pass test secret for 38 days
before the Turnstile dashboard's "Siteverify isn't being called for this
widget" banner gave it away — see
`docs/lessons/deploy/presence-preflight-cannot-see-a-test-secret.md`. A
preview deployment may still use the test pair deliberately.

To confirm the stored secret is the widget's own, submit one real form on the
deployed site and watch the widget's **Token validation** panel in the
Turnstile dashboard: the Siteverify request count must move. Nothing on the
Vercel side can check it.

When the app starts reading a new env var, add it to the manifest — the
spec in `src/lib/deploy/env-manifest.spec.ts` pins the list, so the change
is deliberate and reviewed.
