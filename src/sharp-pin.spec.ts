/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { readFileSync } from 'node:fs';

import { z } from 'zod';

/**
 * Repo-policy check, not a unit test — sharp must stay on 0.34.x until
 * lovell/sharp#4567 is fixed.
 *
 * sharp 0.35.x loads libvips from the separate @img/sharp-libvips-linux-x64
 * package, and Vercel's output file tracing follows JS requires only — it
 * cannot see the ELF-level dependency on that package's libvips-cpp.so. The
 * build succeeds (libvips exists in the build machine's node_modules, so
 * prerendering works), but the deployed function bundle omits the shared
 * library. Payload imports sharp at module scope, so EVERY lambda invocation
 * throws ERR_DLOPEN_FAILED at cold start: /admin, /api/search, Server
 * Actions, and ISR revalidation all 500 while stale prerendered pages mask
 * the outage. This took production down from 2026-08-02 until diagnosed on
 * 2026-09-03.
 *
 * The 0.35 bump arrived via the 2026-08-02 audit sweep (its advisory's patch
 * only exists in 0.35), so the advisory is accepted in pnpm-workspace.yaml's
 * auditConfig instead — see the reasoning there. Delete this spec and lift
 * the pin only once sharp 0.35.x is confirmed traceable on Vercel
 * (lovell/sharp#4567 resolved) AND /admin verified on a deploy.
 */

const packageSchema = z.object({
  dependencies: z.object({ sharp: z.string() }),
});

describe('sharp Vercel-runtime pin', () => {
  it('keeps the direct sharp dependency inside the 0.34 caret', () => {
    const { dependencies } = packageSchema.parse(JSON.parse(readFileSync('package.json', 'utf8')));

    expect(dependencies.sharp).toMatch(/^\^0\.34\./);
  });

  it('has no pnpm override forcing sharp onto 0.35', () => {
    const workspaceWithoutComments = readFileSync('pnpm-workspace.yaml', 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n');

    expect(workspaceWithoutComments).not.toMatch(/sharp@[^:\n]*:[^\n]*0\.35/);
  });

  it('resolves no sharp 0.35.x anywhere in the lockfile', () => {
    const lockfile = readFileSync('pnpm-lock.yaml', 'utf8');

    expect(lockfile).not.toMatch(/sharp@0\.35\./);
  });
});
