/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import {
  CONFIRM_TOKEN_PATTERN,
  DB_PROBE_TOKEN,
  E2E_BASE_URL,
  E2E_PORT,
  dbProbeUrl,
  makeEnv,
} from '@/lib/e2e/harness-config';

/**
 * `e2e/AGENTS.md` states the harness's invariants in prose; this turns each
 * of them into an assertion that goes red when the harness stops honouring
 * it. Prose alone has already drifted from code once in this repo — a rule
 * nothing verifies is a rule that rots.
 */
const URI = 'mongodb://127.0.0.1:45678/e2e';
const PARAMS = 'connectTimeoutMS=15000';

/**
 * A Map rather than the record itself: reading an env bag by a computed key
 * is exactly what `security/detect-object-injection` flags.
 */
const envFor = (uri: string, params: string): Map<string, string | undefined> =>
  new Map(Object.entries(makeEnv(uri, params)));

/**
 * Every key the harness pins. Anything a developer's shell (or a leaked
 * `.env.local`) could set here must lose to the pinned value, so each one is
 * hostile-stubbed below.
 */
const PINNED = [
  'BLOB_READ_WRITE_TOKEN',
  'DATABASE_URL',
  'EMAIL_LOG_UNSENT',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'PAYLOAD_SECRET',
  'SMTP_HOST',
  'TURNSTILE_SECRET_KEY',
] as const;

const HOSTILE = 'value-from-the-developers-own-environment';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('makeEnv hermeticity', () => {
  it("forces the JSON mail transport, so no email can leave the suite ('' SMTP_HOST)", () => {
    expect(envFor(URI, PARAMS).get('SMTP_HOST')).toBe('');
  });

  it('keeps the Vercel Blob plugin off with an empty token', () => {
    expect(envFor(URI, PARAMS).get('BLOB_READ_WRITE_TOKEN')).toBe('');
  });

  it('opts the JSON transport into logging message content for the log scrape', () => {
    expect(envFor(URI, PARAMS).get('EMAIL_LOG_UNSENT')).toBe('true');
  });

  it("uses Cloudflare's always-pass Turnstile test site key", () => {
    expect(envFor(URI, PARAMS).get('NEXT_PUBLIC_TURNSTILE_SITE_KEY')).toBe(
      '1x00000000000000000000AA'
    );
  });

  it("uses Cloudflare's always-pass Turnstile test secret key", () => {
    expect(envFor(URI, PARAMS).get('TURNSTILE_SECRET_KEY')).toBe(
      '1x0000000000000000000000000000000AA'
    );
  });

  it('points the app at the throwaway in-memory database, with the driver params', () => {
    expect(envFor(URI, PARAMS).get('DATABASE_URL')).toBe(`${URI}?${PARAMS}`);
  });

  it('pins a throwaway Payload secret rather than reusing a real one', () => {
    expect(envFor(URI, PARAMS).get('PAYLOAD_SECRET')).toBe('e2e-secret');
  });

  it.each(PINNED)('overrides %s even when the surrounding environment sets it', (key) => {
    vi.stubEnv(key, HOSTILE);
    expect(envFor(URI, PARAMS).get(key)).not.toBe(HOSTILE);
  });

  it('still inherits the rest of the environment, so pnpm and next can run', () => {
    vi.stubEnv('E2E_UNPINNED_FIXTURE', 'inherited');
    expect(envFor(URI, PARAMS).get('E2E_UNPINNED_FIXTURE')).toBe('inherited');
  });
});

describe('dedicated E2E port', () => {
  /**
   * On 3000 a developer's `pnpm dev` — often backed by a real database —
   * could already be listening, and the specs WRITE.
   */
  it("is never Next's default 3000", () => {
    expect(E2E_PORT).not.toBe(3000);
  });

  it('is the port the harness base URL addresses', () => {
    expect(E2E_BASE_URL).toBe(`http://localhost:${E2E_PORT}`);
  });
});

describe('database readiness probe token', () => {
  /**
   * The probe hits a DB-backed route so a wedged mongo pool cannot hide
   * behind prerendered HTML. Its token is deliberately non-hex: if the probe
   * URL is ever written to `e2e-server.log`, the newsletter spec's scrape
   * must not pick it up and try to confirm a subscription that never existed.
   */
  it('can never match the confirm-token pattern the newsletter spec scrapes', () => {
    expect(CONFIRM_TOKEN_PATTERN.test(dbProbeUrl(E2E_BASE_URL))).toBe(false);
  });

  it('is the same length as a real confirm token, so the route does a real lookup', () => {
    expect(DB_PROBE_TOKEN).toHaveLength(64);
  });

  /** Positive control: a pattern that matched nothing would pass the test above vacuously. */
  it('matches a genuine confirm link', () => {
    expect(CONFIRM_TOKEN_PATTERN.test(`/newsletter/confirm?token=${'a1b2c3d4'.repeat(8)}`)).toBe(
      true
    );
  });

  it('captures the token out of a genuine confirm link', () => {
    const token = 'a1b2c3d4'.repeat(8);
    expect(CONFIRM_TOKEN_PATTERN.exec(`/newsletter/confirm?token=${token}`)?.[1]).toBe(token);
  });

  it('probes a database-backed route rather than the prerendered home page', () => {
    expect(dbProbeUrl(E2E_BASE_URL)).toBe(
      `${E2E_BASE_URL}/newsletter/confirm?token=${DB_PROBE_TOKEN}`
    );
  });
});

describe('coupling with the playwright spec', () => {
  const newsletterSpec = readFileSync('e2e/newsletter.spec.ts', 'utf8');

  /**
   * The two halves of this invariant live in different runtimes, so the only
   * thing that keeps them coupled is sharing one constant. A second copy of
   * the pattern would drift, and the drift would only show up as a
   * mysteriously flaky opt-in spec.
   */
  it('has the newsletter spec import the shared pattern', () => {
    expect(newsletterSpec).toContain("from '@/lib/e2e/harness-config'");
  });

  it('leaves no second copy of the confirm-token pattern in the newsletter spec', () => {
    expect(newsletterSpec).not.toContain('[0-9a-f]{64}');
  });
});
