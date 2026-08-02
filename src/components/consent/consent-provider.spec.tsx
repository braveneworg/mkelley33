/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent, writeConsent } from '@/lib/consent/consent-storage';
import { deleteGaCookies, updateAnalyticsConsent } from '@/lib/consent/gtag';

vi.mock('@/lib/consent/gtag', () => ({
  deleteGaCookies: vi.fn(),
  updateAnalyticsConsent: vi.fn(),
}));

const Probe = () => {
  const consent = useConsent();
  return (
    <div>
      <span data-testid="status">{consent.status}</span>
      <span data-testid="analytics">{String(consent.analyticsGranted)}</span>
      <span data-testid="preferences-open">{String(consent.preferencesOpen)}</span>
      <button onClick={consent.grantAll} type="button">
        grant
      </button>
      <button onClick={consent.denyAll} type="button">
        deny
      </button>
      <button onClick={() => consent.save({ analytics: true })} type="button">
        save-on
      </button>
      <button onClick={consent.openPreferences} type="button">
        open
      </button>
      <button onClick={consent.closePreferences} type="button">
        close
      </button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <ConsentProvider>
      <Probe />
    </ConsentProvider>
  );

describe('ConsentProvider', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('hydrates to undecided when nothing is stored', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('undecided');
    });
  });

  it('hydrates to decided/granted from a stored grant', async () => {
    writeConsent(true);
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('analytics')).toHaveTextContent('true');
    });
  });

  it('re-seeds the granted consent signal on hydration', async () => {
    writeConsent(true);
    renderProbe();
    await waitFor(() => {
      expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);
    });
  });

  it('hydrates to decided from a stored decline', async () => {
    writeConsent(false);
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent(/^decided$/);
    });
  });

  it('does not re-seed the consent signal for a stored decline', async () => {
    writeConsent(false);
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent(/^decided$/);
    });
    expect(updateAnalyticsConsent).not.toHaveBeenCalled();
  });

  it('grantAll persists a granted record', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('grantAll pushes a granted consent update', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);
  });

  // Anchored: `toHaveTextContent('decided')` matches a substring, and
  // 'undecided' contains 'decided' — the unanchored form passes even when the
  // decision never flips the status, so the banner would never dismiss.
  it('grantAll marks the visitor as decided', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(screen.getByTestId('status')).toHaveTextContent(/^decided$/);
  });

  it('grantAll leaves the GA cookies in place', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(deleteGaCookies).not.toHaveBeenCalled();
  });

  it('denyAll persists a declined record', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('denyAll deletes the GA cookies', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(deleteGaCookies).toHaveBeenCalledTimes(1);
  });

  it('save applies the given analytics choice', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'save-on' }));
    expect(screen.getByTestId('analytics')).toHaveTextContent('true');
  });

  it('a decision closes the preferences dialog', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('false');
  });

  it('openPreferences and closePreferences toggle preferencesOpen', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('closePreferences closes an open preferences dialog', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('false');
  });

  it('useConsent outside the provider throws', () => {
    const BareProbe = () => {
      useConsent();
      return null;
    };
    expect(() => render(<BareProbe />)).toThrow('useConsent must be used inside <ConsentProvider>');
  });
});
