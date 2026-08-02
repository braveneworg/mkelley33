/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentBanner } from '@/components/consent/consent-banner';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent, writeConsent } from '@/lib/consent/consent-storage';

const ConsentProbe = () => {
  const { preferencesOpen, status } = useConsent();
  return (
    <div>
      <span data-testid="preferences-open">{String(preferencesOpen)}</span>
      <span data-testid="status">{status}</span>
    </div>
  );
};

const renderBanner = () =>
  render(
    <ConsentProvider>
      <ConsentBanner />
      <ConsentProbe />
    </ConsentProvider>
  );

/**
 * Gate an absence assertion behind proof that hydration finished. `waitFor`
 * resolves on its first pass, and the provider starts in 'loading' with the
 * banner unrendered — so asserting absence straight after `render` passes for
 * the wrong reason and cannot fail. Anchored because 'undecided' contains
 * 'decided'.
 */
const waitForDecided = async () => {
  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent(/^decided$/);
  });
};

const queryBanner = () => screen.queryByRole('region', { name: 'cookie consent' });

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
    await waitForDecided();
    expect(queryBanner()).not.toBeInTheDocument();
  });

  it('accept all stores a granted decision', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'accept all' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('disappears once a decision is made', async () => {
    renderBanner();
    // findBy throws when absent, so reaching the click proves the region was
    // on screen — the disappearance below cannot pass for the wrong reason.
    await screen.findByRole('region', { name: 'cookie consent' });
    await userEvent.click(screen.getByRole('button', { name: 'accept all' }));
    await waitFor(() => {
      expect(queryBanner()).not.toBeInTheDocument();
    });
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
