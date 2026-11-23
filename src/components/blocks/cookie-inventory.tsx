/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { CONSENT_CATEGORIES } from '@/lib/consent/inventory';

/**
 * Everything the site stores or loads, one table for each consent category.
 * It takes nothing from the Page: the rows are the consent code's own list,
 * the same one the cookie form shows (docs/adr/0002).
 */
export const CookieInventory = () => (
  <BlockSection>
    <div className="space-y-6">
      {CONSENT_CATEGORIES.map(({ id, title }) => (
        <section key={id}>
          <h3 className="font-mono text-sm font-bold">{title}</h3>
          <div className="mt-2 max-w-2xl">
            <CookieInventoryTable category={id} />
          </div>
        </section>
      ))}
    </div>
  </BlockSection>
);
