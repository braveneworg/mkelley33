/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The RSS alternate shared by the site layout and the homepage. A page-level
 * `alternates` replaces the layout's object wholesale, so any page overriding
 * `alternates.canonical` must re-declare this — importing one constant keeps
 * the two declarations from drifting.
 */
export const feedAlternateTypes = {
  'application/rss+xml': '/feed.xml',
};
