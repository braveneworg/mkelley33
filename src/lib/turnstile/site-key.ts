/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The client half of the Turnstile pair. It reads only `NEXT_PUBLIC_*`, so
 * everything it touches is already public and there is nothing here a browser
 * bundle should not have. Its sibling `verify.ts` reads the secret and is
 * marked `server-only`; keeping the two in separate files is what makes the
 * client/server seam a boundary the bundler can see rather than a tree-shaking
 * accident.
 */

/** Cloudflare's official always-pass test site key — dev/CI fallback only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * The site key the `<Turnstile />` widget renders with. `??`, not `||`: an
 * explicitly empty value is passed through as configured rather than quietly
 * replaced, so a blank deploy variable surfaces as a broken widget instead of
 * a silently always-passing one.
 */
export const turnstileSiteKey = (): string =>
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;
