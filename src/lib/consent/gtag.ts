/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Consent Mode v2 plumbing for the hard-gated GA setup.
 *
 * CONSENT_MODE_BOOTSTRAP runs as a parse-time inline script in the site
 * layout: it seeds a denied-by-default consent state on the dataLayer and
 * defines the global `gtag` before the GA script could ever load. It must
 * stay a classic `function` inside the string — gtag.js only recognizes
 * commands pushed as `arguments` objects, which arrow functions cannot
 * produce.
 */
export const CONSENT_MODE_BOOTSTRAP =
  'window.dataLayer=window.dataLayer||[];' +
  'function gtag(){dataLayer.push(arguments);}' +
  'window.gtag=gtag;' +
  "gtag('consent','default',{ad_personalization:'denied',ad_storage:'denied',ad_user_data:'denied',analytics_storage:'denied'});";

interface GtagGlobals {
  gtag?: (...args: unknown[]) => void;
}

/**
 * Pushes a Consent Mode v2 update. A no-op when the bootstrap has not run
 * (unit tests, non-browser contexts) — the queue function is the bootstrap's
 * to define.
 */
export const updateAnalyticsConsent = (granted: boolean): void => {
  const { gtag } = globalThis as GtagGlobals;
  gtag?.('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
};

/** The one thing a reload target has to offer — `Location` satisfies it. */
interface Reloadable {
  reload: () => void;
}

/**
 * Reloads the current document. Withdrawing consent cannot unload the GA and
 * Vercel runtimes a grant already started, so the provider reloads to kill
 * them outright. The target is a parameter because `window.location` is
 * unforgeable in jsdom: nothing else can observe the call.
 */
export const reloadPage = (target: Reloadable = globalThis.location): void => {
  target.reload();
};

const GA_COOKIE_PATTERN = /^_ga($|_)/;
const COOKIE_EXPIRY = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

/**
 * Best-effort removal of GA's first-party cookies on withdrawal. GA sets
 * them host-wide, so each name is expired against the bare path, the exact
 * hostname, and the dot-prefixed domain.
 */
export const deleteGaCookies = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const names = document.cookie
    .split(';')
    .map((pair) => pair.split('=')[0].trim())
    .filter((name) => GA_COOKIE_PATTERN.test(name));
  const { hostname } = globalThis.location;
  names.forEach((name) => {
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/`;
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/; domain=${hostname}`;
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/; domain=.${hostname}`;
  });
};
