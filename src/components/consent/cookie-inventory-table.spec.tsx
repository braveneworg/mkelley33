/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { inventoryFor } from '@/lib/consent/inventory';

describe('CookieInventoryTable', () => {
  it('renders one row per analytics inventory item', () => {
    render(<CookieInventoryTable category="analytics" />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(inventoryFor('analytics').length + 1);
  });

  it('names the GA cookie', () => {
    render(<CookieInventoryTable category="analytics" />);
    expect(screen.getByText('_ga')).toBeInTheDocument();
  });

  it('does not leak items from other categories', () => {
    render(<CookieInventoryTable category="essential" />);
    expect(screen.queryByText('_ga')).not.toBeInTheDocument();
  });
});
