/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { inventoryFor } from '@/lib/consent/inventory';
import type { ConsentCategoryId } from '@/lib/consent/inventory';

const HEADER_CELL_CLASSES = 'px-2 py-1.5 font-normal';
const CELL_CLASSES = 'border-edge border-t px-2 py-1.5 align-top';

export const CookieInventoryTable = ({ category }: { category: ConsentCategoryId }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left font-mono text-xs">
      <caption className="sr-only">{`${category} cookies and storage`}</caption>
      <thead>
        <tr className="text-fg-muted">
          <th className={HEADER_CELL_CLASSES} scope="col">
            name
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            type
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            provider
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            purpose
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            duration
          </th>
        </tr>
      </thead>
      <tbody>
        {inventoryFor(category).map((item) => (
          <tr key={item.name}>
            <td className={CELL_CLASSES}>{item.name}</td>
            <td className={CELL_CLASSES}>{item.type}</td>
            <td className={CELL_CLASSES}>{item.provider}</td>
            <td className={CELL_CLASSES}>{item.purpose}</td>
            <td className={CELL_CLASSES}>{item.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
