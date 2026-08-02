/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { ManageCookiePreferences } from '@/components/consent/manage-cookie-preferences';

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

describe('ManageCookiePreferences', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('opens the preferences dialog state', async () => {
    render(
      <ConsentProvider>
        <ManageCookiePreferences />
        <PreferencesProbe />
      </ConsentProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'manage cookie preferences' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });
});
