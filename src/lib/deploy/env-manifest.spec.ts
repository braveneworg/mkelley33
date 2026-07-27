/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  auditDeployEnv,
  FORBIDDEN_DEPLOY_ENV,
  REQUIRED_DEPLOY_ENV,
} from '@/lib/deploy/env-manifest';

const allRequired = (): string[] => [...REQUIRED_DEPLOY_ENV];

describe('REQUIRED_DEPLOY_ENV', () => {
  it('covers every production env var the app reads', () => {
    expect([...REQUIRED_DEPLOY_ENV].sort()).toEqual([
      'BLOB_READ_WRITE_TOKEN',
      'CONTACT_TO',
      'DATABASE_URL',
      'EMAIL_FROM',
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'PAYLOAD_SECRET',
      'SMTP_HOST',
      'SMTP_PASS',
      'SMTP_PORT',
      'SMTP_USER',
      'TURNSTILE_SECRET_KEY',
    ]);
  });

  it('never overlaps the forbidden list', () => {
    const required = new Set<string>(REQUIRED_DEPLOY_ENV);
    expect(FORBIDDEN_DEPLOY_ENV.filter((name) => required.has(name))).toEqual([]);
  });
});

describe('auditDeployEnv', () => {
  it('passes a complete environment with nothing forbidden', () => {
    expect(auditDeployEnv(allRequired())).toEqual({ forbidden: [], missing: [] });
  });

  it('lists every missing required name, sorted', () => {
    const present = allRequired().filter((name) => name !== 'DATABASE_URL' && name !== 'SMTP_HOST');
    expect(auditDeployEnv(present).missing).toEqual(['DATABASE_URL', 'SMTP_HOST']);
  });

  it('lists forbidden names that are present', () => {
    expect(auditDeployEnv([...allRequired(), 'EMAIL_LOG_UNSENT']).forbidden).toEqual([
      'EMAIL_LOG_UNSENT',
    ]);
  });

  it('ignores unrelated extra names', () => {
    const audit = auditDeployEnv([...allRequired(), 'NODE_ENV', 'VERCEL_ENV']);
    expect(audit).toEqual({ forbidden: [], missing: [] });
  });

  it('reports everything missing for an empty environment', () => {
    const audit = auditDeployEnv([]);
    expect(audit.missing).toEqual([...REQUIRED_DEPLOY_ENV].sort());
    expect(audit.forbidden).toEqual([]);
  });
});
