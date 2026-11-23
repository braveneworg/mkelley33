/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Where a Page lives. A Page's address is one name, one level deep
 * (`/uses`); the home Page is the one exception and answers at the root.
 * No React and no Payload in here, so the collection config, the routes and
 * the Seed can all share it.
 */

/** The name the home Page is stored under. It is served at `/`, never `/home`. */
export const HOME_SLUG = 'home';

/**
 * The address of the privacy policy. The footer links to it by itself, and
 * the Page there is guarded: see `privacy-page.ts`.
 */
export const PRIVACY_SLUG = 'privacy';

/**
 * The Fixed Pages (see `CONTEXT.md`): the rest of the site depends on
 * finding each at its address, so the owner edits them but cannot move or
 * delete them.
 */
export const FIXED_PAGE_SLUGS: readonly string[] = [
  HOME_SLUG,
  'blog',
  'contact',
  'services',
  PRIVACY_SLUG,
];

export const isFixedPage = (slug: string): boolean => FIXED_PAGE_SLUGS.includes(slug);

/**
 * Names the code already serves at one level. A Page created under one
 * would sit in the admin and never be shown, because the code's own route
 * wins. `src/lib/pages/reserved-names.spec.ts` reads the route tree and
 * fails when a route is added without its name here.
 *
 * `index` is not a route file: Next answers `/index` with the root route.
 */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'index',
  'newsletter',
  'opengraph-image',
  'preview',
]);

/** Lower-case words joined by hyphens: what an address can carry unescaped. */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** The address visitors use for the Page stored under `slug`. */
export const pageHref = (slug: string): string => (slug === HOME_SLUG ? '/' : `/${slug}`);

/**
 * Payload's field validator for a Page's address: `true`, or the sentence
 * the admin shows under the field.
 */
export const validatePageSlug = (value: null | string | undefined): string | true => {
  if (typeof value !== 'string' || value === '') {
    return 'A Page needs an address.';
  }
  if (!SLUG.test(value)) {
    return 'Use lower-case letters, digits and hyphens only — one name, no slashes or dots.';
  }
  if (RESERVED_PAGE_SLUGS.has(value)) {
    return `"${value}" is already used by the site itself. Choose another address.`;
  }
  return true;
};

/**
 * Where the admin's Preview button goes for the page at `path`: the preview
 * route, which checks who is asking before it shows any draft. It lives
 * here, away from that route's helpers, so the Payload config can use it
 * without pulling Next's request APIs into scripts that load the config.
 */
export const previewAddress = (path: string): string =>
  `/preview?${new URLSearchParams({ path }).toString()}`;
