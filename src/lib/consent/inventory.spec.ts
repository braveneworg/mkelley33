/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';
import { CONSENT_CATEGORIES, CONSENT_INVENTORY, inventoryFor } from '@/lib/consent/inventory';

describe('consent inventory', () => {
  // Order is rendered order in both the dialog and the privacy page. Essential
  // comes first because it is the one category a visitor cannot turn off —
  // reversing it would put a choice above a non-choice.
  it('lists essential before analytics', () => {
    expect(CONSENT_CATEGORIES.map((category) => category.id)).toEqual(['essential', 'analytics']);
  });

  it('has at least one item in every category', () => {
    const populated = CONSENT_CATEGORIES.every((category) => inventoryFor(category.id).length > 0);
    expect(populated).toBe(true);
  });

  it('has unique item names', () => {
    const names = CONSENT_INVENTORY.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('lists the consent record itself under essential', () => {
    const names = inventoryFor('essential').map((item) => item.name);
    expect(names).toContain(CONSENT_STORAGE_KEY);
  });

  // Turnstile runs on both forms without asking, under legitimate interest —
  // which makes disclosing it more important, not less.
  it('lists turnstile under essential', () => {
    const names = inventoryFor('essential').map((item) => item.name);
    expect(names).toContain('turnstile');
  });

  it('lists the GA cookies under analytics', () => {
    const names = inventoryFor('analytics').map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(['_ga', '_ga_*']));
  });

  it('inventoryFor returns only items of the requested category', () => {
    const offCategory = inventoryFor('analytics').filter((item) => item.category !== 'analytics');
    expect(offCategory).toEqual([]);
  });
});
