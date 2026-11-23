/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { parseEnv } from 'node:util';

import { auditDeployEnv } from '@/lib/deploy/env-manifest';

/**
 * Audits the raw contents of an env file `vercel pull` wrote. This is the
 * whole deploy preflight behind one call — scripts/check-deploy-env.ts is a
 * thin argv/exit adapter over it, so the parsing, the emptiness rule, and
 * the report format are all testable here instead of living untested in the
 * script (the predecessor hand-rolled its line parser and mis-read quoted
 * and multi-line values; `util.parseEnv` is the platform's own dotenv
 * grammar).
 *
 * A key counts as present only when it has a non-empty value: `KEY=` or
 * `KEY=""` behaves like an unset var in this app (falsy checks gate the
 * email transport and Turnstile fallbacks), so it audits as missing.
 *
 * Nothing here judges what a value looks like. A variable stored as
 * sensitive pulls as a redaction marker, so presence is all this file can
 * know — see `RequiredDeployEnvVar` in env-manifest.ts.
 */

export interface DeployEnvFileAudit {
  forbidden: string[];
  missing: string[];
  passed: boolean;
}

export const auditEnvFile = (contents: string): DeployEnvFileAudit => {
  const present = Object.entries(parseEnv(contents)).flatMap(([name, value]) =>
    typeof value === 'string' && value.length > 0 ? [name] : []
  );
  const { forbidden, missing } = auditDeployEnv(present);
  return { forbidden, missing, passed: forbidden.length === 0 && missing.length === 0 };
};

export interface DeployEnvFileReport {
  exitCode: 0 | 1;
  stderrLines: string[];
  stdoutLines: string[];
}

/**
 * Renders an audit as the preflight's CLI contract: per-name fix-it lines
 * and a counting summary on stderr with exit 1, or the single pass line on
 * stdout with exit 0. Only KEY NAMES ever appear — values never leave the
 * audit, so the output is safe for CI logs.
 */
export const renderEnvFileAudit = ({
  forbidden,
  missing,
  passed,
}: DeployEnvFileAudit): DeployEnvFileReport => {
  if (passed) {
    return { exitCode: 0, stderrLines: [], stdoutLines: ['deploy env audit passed'] };
  }
  return {
    exitCode: 1,
    stderrLines: [
      ...missing.map(
        (name) =>
          `missing: ${name} — add it to the Vercel project env (Production) before deploying`
      ),
      ...forbidden.map(
        (name) => `forbidden: ${name} — remove it from the Vercel project env (Production)`
      ),
      `deploy env audit failed (${String(missing.length)} missing, ${String(forbidden.length)} forbidden) — see docs/deploy.md`,
    ],
    stdoutLines: [],
  };
};
