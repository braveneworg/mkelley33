/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { auditEnvFile, renderEnvFileAudit } from '@/lib/deploy/audit-env-file';
import { REQUIRED_DEPLOY_ENV } from '@/lib/deploy/env-manifest';

// Assembled from parts so no token-shaped literal ever lands in the repo for
// gitleaks (or a human skimming the diff) to mistake for a live credential.
const wellFormedBlobToken = ['vercel', 'blob', 'rw', 'ExampleStore123', 'notARealSecret'].join('_');

const completeEnv = (overrides: Readonly<Record<string, string>> = {}): string =>
  REQUIRED_DEPLOY_ENV.map((name) => {
    const fallback = name === 'BLOB_READ_WRITE_TOKEN' ? wellFormedBlobToken : 'placeholder-value';
    return `${name}=${new Map(Object.entries(overrides)).get(name) ?? fallback}`;
  }).join('\n');

describe('auditEnvFile', () => {
  it('passes a complete pulled env', () => {
    expect(auditEnvFile(completeEnv())).toEqual({
      forbidden: [],
      malformed: [],
      missing: [],
      passed: true,
    });
  });

  it('treats a bare empty value as missing', () => {
    expect(auditEnvFile(completeEnv({ DATABASE_URL: '' })).missing).toEqual(['DATABASE_URL']);
  });

  it('treats a quoted empty value as missing', () => {
    expect(auditEnvFile(completeEnv({ SMTP_HOST: '""' })).missing).toEqual(['SMTP_HOST']);
  });

  it('unquotes a double-quoted value before format checking', () => {
    const audit = auditEnvFile(completeEnv({ BLOB_READ_WRITE_TOKEN: `"${wellFormedBlobToken}"` }));
    expect(audit.passed).toBe(true);
  });

  it('parses a multi-line quoted value as one present entry', () => {
    const audit = auditEnvFile(completeEnv({ PAYLOAD_SECRET: '"line one\nline two"' }));
    expect(audit).toEqual({ forbidden: [], malformed: [], missing: [], passed: true });
  });

  it('accepts export-prefixed lines', () => {
    const audit = auditEnvFile(`export ${completeEnv()}`);
    expect(audit.missing).toEqual([]);
  });

  it('ignores comment lines', () => {
    expect(auditEnvFile(`# pulled by vercel\n${completeEnv()}`).passed).toBe(true);
  });

  it('tolerates CRLF line endings', () => {
    expect(auditEnvFile(completeEnv().replaceAll('\n', '\r\n')).passed).toBe(true);
  });

  it('reports everything missing for an empty file', () => {
    expect(auditEnvFile('').missing).toEqual([...REQUIRED_DEPLOY_ENV].sort());
  });

  it('reports a forbidden name that is present', () => {
    const audit = auditEnvFile(`${completeEnv()}\nEMAIL_LOG_UNSENT=1`);
    expect(audit.forbidden).toEqual(['EMAIL_LOG_UNSENT']);
  });

  it('reports a malformed value by name', () => {
    const audit = auditEnvFile(completeEnv({ BLOB_READ_WRITE_TOKEN: 'placeholder-value' }));
    expect(audit).toEqual({
      forbidden: [],
      malformed: ['BLOB_READ_WRITE_TOKEN'],
      missing: [],
      passed: false,
    });
  });
});

describe('renderEnvFileAudit', () => {
  it('renders a passing audit as stdout with exit code 0', () => {
    expect(renderEnvFileAudit(auditEnvFile(completeEnv()))).toEqual({
      exitCode: 0,
      stderrLines: [],
      stdoutLines: ['deploy env audit passed'],
    });
  });

  it('names each missing variable with a fix-it hint', () => {
    const report = renderEnvFileAudit(auditEnvFile(completeEnv({ DATABASE_URL: '' })));
    expect(report.stderrLines[0]).toBe(
      'missing: DATABASE_URL — add it to the Vercel project env (Production) before deploying'
    );
  });

  it('names each forbidden variable', () => {
    const report = renderEnvFileAudit(auditEnvFile(`${completeEnv()}\nEMAIL_LOG_UNSENT=1`));
    expect(report.stderrLines[0]).toBe(
      'forbidden: EMAIL_LOG_UNSENT — remove it from the Vercel project env (Production)'
    );
  });

  it('describes the expected shape for a malformed variable', () => {
    const report = renderEnvFileAudit(
      auditEnvFile(completeEnv({ BLOB_READ_WRITE_TOKEN: 'not-a-blob-token' }))
    );
    expect(report.stderrLines[0]).toBe(
      'malformed: BLOB_READ_WRITE_TOKEN — set it to a value shaped like vercel_blob_rw_<store id>_<random string>'
    );
  });

  it('summarizes failure counts on the last stderr line with exit code 1', () => {
    const report = renderEnvFileAudit(
      auditEnvFile(completeEnv({ DATABASE_URL: '', BLOB_READ_WRITE_TOKEN: 'not-a-blob-token' }))
    );
    expect(report.exitCode).toBe(1);
    expect(report.stderrLines.at(-1)).toBe(
      'deploy env audit failed (1 missing, 0 forbidden, 1 malformed) — see docs/deploy.md'
    );
  });

  it('never echoes a rejected value', () => {
    const report = renderEnvFileAudit(
      auditEnvFile(completeEnv({ BLOB_READ_WRITE_TOKEN: 'sentinel-leaky-value' }))
    );
    expect(JSON.stringify(report)).not.toContain('sentinel-leaky-value');
  });
});
