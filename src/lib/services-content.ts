/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * A service as the site shows it. The records live in the `services`
 * collection and nowhere else (docs/adr/0001); the Seed in `seed/services.json`
 * is what first puts them there.
 */
export interface ServiceContent {
  credibility: string;
  deliverables: string[];
  name: string;
  pitch: string;
  slug: string;
}
