/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Deploy preflight: audits the env file `vercel pull` wrote against the
 * manifest in src/lib/deploy/env-manifest.ts and fails the deploy if any
 * required name is absent/empty or any forbidden name is set.
 *
 * Only KEY NAMES are ever read into the report — values never leave this
 * process, so the output is safe for CI logs.
 *
 * Usage: pnpm exec tsx scripts/check-deploy-env.ts .vercel/.env.production.local
 */
import { readFileSync } from 'node:fs';

import { auditDeployEnv } from '../src/lib/deploy/env-manifest';

const envFilePath = process.argv[2];
if (!envFilePath) {
  console.error('usage: tsx scripts/check-deploy-env.ts <pulled-env-file>');
  process.exit(2);
}

let raw: string;
try {
  raw = readFileSync(envFilePath, 'utf8');
} catch {
  console.error(`cannot read ${envFilePath} — did \`vercel pull\` run first?`);
  process.exit(2);
}

// A key counts as present only when it has a non-empty value; `KEY=` or
// `KEY=""` behaves like an unset var in this app (falsy checks gate the
// email transport and Turnstile fallbacks), so treat it as missing.
const presentKeys = raw
  .split('\n')
  .map((line) => /^(?<key>[A-Za-z_][A-Za-z0-9_]*)=(?<value>.*)$/.exec(line.trim()))
  .filter((match) => match !== null)
  .filter((match) => (match.groups?.value ?? '').replace(/^["']|["']$/g, '').length > 0)
  .map((match) => match.groups?.key ?? '');

const { forbidden, missing } = auditDeployEnv(presentKeys);

for (const name of missing) {
  console.error(
    `missing: ${name} — add it to the Vercel project env (Production) before deploying`
  );
}
for (const name of forbidden) {
  console.error(`forbidden: ${name} — remove it from the Vercel project env (Production)`);
}

if (missing.length > 0 || forbidden.length > 0) {
  console.error(
    `deploy env audit failed (${String(missing.length)} missing, ${String(forbidden.length)} forbidden) — see docs/deploy.md`
  );
  process.exit(1);
}

console.info('deploy env audit passed');
