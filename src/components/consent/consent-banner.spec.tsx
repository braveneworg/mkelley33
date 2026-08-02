/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentBanner } from '@/components/consent/consent-banner';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent, writeConsent } from '@/lib/consent/consent-storage';

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

const renderBanner = () =>
  render(
    <ConsentProvider>
      <ConsentBanner />
      <PreferencesProbe />
    </ConsentProvider>
  );

describe('ConsentBanner', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('appears while the visitor is undecided', async () => {
    renderBanner();
    expect(await screen.findByRole('region', { name: 'cookie consent' })).toBeInTheDocument();
  });

  it('stays hidden once a decision exists', async () => {
    writeConsent(false);
    renderBanner();
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'cookie consent' })).not.toBeInTheDocument();
    });
  });

  it('accept all stores a granted decision and hides the banner', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'accept all' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('decline all stores a declined decision', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'decline all' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('customize opens the preferences dialog state', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'customize' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('links to the privacy page', async () => {
    renderBanner();
    expect(await screen.findByRole('link', { name: 'privacy' })).toHaveAttribute(
      'href',
      '/privacy'
    );
  });
});
