/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Deploy preflight: audits the env file `vercel pull` wrote and fails the
 * deploy if any required name is absent/empty or any forbidden name is
 * set. It never judges a value's shape — a variable stored as sensitive
 * pulls as a redaction marker. Parsing, the audit,
 * and the report format all live (spec'd) in
 * src/lib/deploy/audit-env-file.ts — this file only does argv, file IO,
 * and the process exit.
 *
 * Usage: pnpm exec tsx scripts/check-deploy-env.ts <pulled-env-file>
 */
import { readFileSync } from 'node:fs';

import { auditEnvFile, renderEnvFileAudit } from '../src/lib/deploy/audit-env-file';

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

const { exitCode, stderrLines, stdoutLines } = renderEnvFileAudit(auditEnvFile(raw));
for (const line of stderrLines) {
  console.error(line);
}
for (const line of stdoutLines) {
  console.info(line);
}
process.exit(exitCode);
