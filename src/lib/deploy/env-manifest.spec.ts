/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import {
  auditDeployEnv,
  FORBIDDEN_DEPLOY_ENV,
  REQUIRED_DEPLOY_ENV,
  REQUIRED_DEPLOY_ENV_VARS,
  SENSITIVE_DEPLOY_ENV,
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

describe('SENSITIVE_DEPLOY_ENV', () => {
  it('pins the names stored with vercel env add --sensitive', () => {
    expect([...SENSITIVE_DEPLOY_ENV].sort()).toEqual([
      'BLOB_READ_WRITE_TOKEN',
      'DATABASE_URL',
      'PAYLOAD_SECRET',
      'SMTP_PASS',
      'SMTP_USER',
      'TURNSTILE_SECRET_KEY',
    ]);
  });
});

/**
 * docs/deploy.md documents the same variables the manifest requires — its
 * purpose table and the two `vercel env add` blocks used to be a third and
 * fourth hand-maintained copy of this knowledge. These guards make the docs
 * follow the records: add a variable without documenting it (or store it
 * with the wrong sensitivity flag) and the suite goes red.
 */
describe('docs/deploy.md', () => {
  const docs = readFileSync('docs/deploy.md', 'utf8');

  it('documents every required variable', () => {
    expect(REQUIRED_DEPLOY_ENV.filter((name) => !docs.includes(`\`${name}\``))).toEqual([]);
  });

  it('stores every sensitive variable with --sensitive', () => {
    const missing = SENSITIVE_DEPLOY_ENV.filter(
      (name) => !docs.includes(`vercel env add ${name} production --sensitive`)
    );
    expect(missing).toEqual([]);
  });

  it('stores every readable variable with --no-sensitive', () => {
    const readable = REQUIRED_DEPLOY_ENV_VARS.filter(({ sensitive }) => !sensitive).map(
      ({ name }) => name
    );
    const missing = readable.filter(
      (name) => !docs.includes(`vercel env add ${name} production --no-sensitive`)
    );
    expect(missing).toEqual([]);
  });
});
