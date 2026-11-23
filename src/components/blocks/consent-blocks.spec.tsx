/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CookieInventory } from '@/components/blocks/cookie-inventory';
import { ManagePreferences } from '@/components/blocks/manage-preferences';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { CONSENT_CATEGORIES, CONSENT_INVENTORY } from '@/lib/consent/inventory';

/**
 * Neither Block takes a prop: what they show is the consent code's, so the
 * privacy Page cannot say one thing while the site stores another
 * (docs/adr/0002).
 */
describe('CookieInventory', () => {
  it.each(CONSENT_CATEGORIES.map(({ title }) => title))('heads a table with %s', (title) => {
    render(<CookieInventory />);

    expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
  });

  it('gives every category a table of its own', () => {
    render(<CookieInventory />);

    expect(screen.getAllByRole('table')).toHaveLength(CONSENT_CATEGORIES.length);
  });

  it('lists everything the consent code says the site stores', () => {
    render(<CookieInventory />);

    // The header row of each table is not an inventory item.
    expect(screen.getAllByRole('row')).toHaveLength(
      CONSENT_INVENTORY.length + CONSENT_CATEGORIES.length
    );
  });
});

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

describe('ManagePreferences', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('opens the cookie form', async () => {
    render(
      <ConsentProvider>
        <ManagePreferences />
        <PreferencesProbe />
      </ConsentProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'manage cookie preferences' }));

    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });
});
