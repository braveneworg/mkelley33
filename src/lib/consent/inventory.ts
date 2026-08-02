/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';

export type ConsentCategoryId = 'analytics' | 'essential';

export interface ConsentCategory {
  description: string;
  id: ConsentCategoryId;
  title: string;
}

export interface InventoryItem {
  category: ConsentCategoryId;
  duration: string;
  name: string;
  provider: string;
  purpose: string;
  type: 'cookie' | 'local storage' | 'script';
}

/**
 * Single source of truth for everything the site stores or loads, rendered
 * by both the preferences dialog and the privacy page so the two can never
 * drift.
 */
export const CONSENT_CATEGORIES: ConsentCategory[] = [
  {
    description:
      'required for the site to work — remembers your cookie decision and theme. always on, never leaves your browser.',
    id: 'essential',
    title: 'essential',
  },
  {
    description:
      'usage statistics that help improve the site. nothing loads or leaves your browser until you allow it.',
    id: 'analytics',
    title: 'analytics',
  },
];

export const CONSENT_INVENTORY: InventoryItem[] = [
  {
    category: 'analytics',
    duration: '2 years',
    name: '_ga',
    provider: 'google analytics',
    purpose: 'distinguishes returning visitors for usage statistics',
    type: 'cookie',
  },
  {
    category: 'analytics',
    duration: '2 years',
    name: '_ga_*',
    provider: 'google analytics',
    purpose: 'keeps session state for this site’s ga4 property',
    type: 'cookie',
  },
  {
    category: 'analytics',
    duration: 'no cookies — aggregate, per visit',
    name: 'vercel analytics',
    provider: 'vercel',
    purpose: 'anonymous, cookieless page metrics',
    type: 'script',
  },
  {
    category: 'essential',
    duration: '12 months',
    name: CONSENT_STORAGE_KEY,
    provider: 'this site',
    purpose: 'remembers your cookie decision',
    type: 'local storage',
  },
  {
    category: 'essential',
    duration: 'until cleared',
    name: 'theme',
    provider: 'this site',
    purpose: 'remembers your light/dark preference',
    type: 'local storage',
  },
];

export const inventoryFor = (category: ConsentCategoryId): InventoryItem[] =>
  CONSENT_INVENTORY.filter((item) => item.category === category);
