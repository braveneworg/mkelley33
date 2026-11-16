/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

/**
 * Repo-policy check, not a unit test — the dependency graph holds one sharp.
 *
 * sharp loads libvips from a separate, version-matched package
 * (@img/sharp-libvips-*), and Payload imports sharp at module scope, so a
 * sharp that cannot find its libvips throws ERR_DLOPEN_FAILED at cold start
 * in EVERY lambda: /admin, /api/search, Server Actions and ISR revalidation
 * all 500 while stale prerendered pages mask the outage. That took
 * production down from 2026-08-02 to 2026-09-03, when sharp 0.35 met a
 * Turbopack (next 16.2) that did not trace the libvips package into the
 * function bundle. next 16.3 fixed the tracing (lovell/sharp#4567), which is
 * what let the 0.34 pin this spec replaces be lifted.
 *
 * Two copies is the way back to the same failure. sharp arrives twice — as
 * the direct dependency Payload uses and as next's optional dependency — and
 * when the two resolve to different versions, two different libvips builds
 * are installed and one sharp can be pointed at the other's (reported in the
 * same upstream thread). Nothing fails at install or build; it surfaces at
 * request time on Vercel only. Keep the direct range in package.json inside
 * whatever next declares, and check /admin on the deploy after any change
 * to either.
 */

/** A lockfile package entry for sharp itself, e.g. `  sharp@0.35.5:`. */
const SHARP_ENTRY = /^ {2}sharp@(\d+\.\d+\.\d+):$/gm;

const resolvedSharpVersions = (): string[] => {
  const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');
  return [...new Set([...lockfile.matchAll(SHARP_ENTRY)].map(([, version]) => version))];
};

describe('sharp in the dependency graph', () => {
  it('resolves to exactly one version', () => {
    expect(resolvedSharpVersions()).toHaveLength(1);
  });
});
