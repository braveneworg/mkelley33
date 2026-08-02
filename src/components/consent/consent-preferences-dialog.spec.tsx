/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentPreferencesDialog } from '@/components/consent/consent-preferences-dialog';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent } from '@/lib/consent/consent-storage';

const OpenProbe = () => {
  const { openPreferences } = useConsent();
  return (
    <button onClick={openPreferences} type="button">
      open-preferences
    </button>
  );
};

const renderDialog = async () => {
  render(
    <ConsentProvider>
      <ConsentPreferencesDialog />
      <OpenProbe />
    </ConsentProvider>
  );
  await userEvent.click(screen.getByRole('button', { name: 'open-preferences' }));
};

describe('ConsentPreferencesDialog', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('opens with an accessible dialog title', async () => {
    await renderDialog();
    expect(screen.getByRole('dialog', { name: 'cookie preferences' })).toBeInTheDocument();
  });

  it('links the description to the dialog', async () => {
    await renderDialog();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      /essential storage is always on/
    );
  });

  it('renders the essential toggle as always on and disabled', async () => {
    await renderDialog();
    expect(screen.getByRole('checkbox', { name: 'always on' })).toBeDisabled();
  });

  it('keeps the essential toggle checked', async () => {
    await renderDialog();
    expect(screen.getByRole('checkbox', { name: 'always on' })).toBeChecked();
  });

  it('defaults the analytics toggle to off when undecided', async () => {
    await renderDialog();
    expect(screen.getByRole('checkbox', { name: 'off' })).not.toBeChecked();
  });

  it('save preferences persists the toggled analytics choice', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'off' }));
    await userEvent.click(screen.getByRole('button', { name: 'save preferences' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('accept all persists a grant', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'accept all' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('decline all persists a refusal', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'decline all' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('a decision closes the dialog', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'decline all' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismissing with escape closes the dialog', async () => {
    await renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('discards an abandoned toggle when reopened', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'off' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'open-preferences' }));
    expect(screen.getByRole('checkbox', { name: 'off' })).not.toBeChecked();
  });
});
