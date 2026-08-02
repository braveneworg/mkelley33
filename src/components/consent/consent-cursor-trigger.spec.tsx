/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentCursorTrigger } from '@/components/consent/consent-cursor-trigger';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { writeConsent } from '@/lib/consent/consent-storage';

const ConsentProbe = () => {
  const { preferencesOpen, status } = useConsent();
  return (
    <div>
      <span data-testid="preferences-open">{String(preferencesOpen)}</span>
      <span data-testid="status">{status}</span>
    </div>
  );
};

const renderTrigger = () =>
  render(
    <ConsentProvider>
      <ConsentCursorTrigger />
      <ConsentProbe />
    </ConsentProvider>
  );

/**
 * Gate the absence assertion behind proof that hydration finished. `waitFor`
 * resolves on its first pass, and the provider starts in 'loading' with the
 * trigger unrendered — so asserting absence straight after `render` passes for
 * the wrong reason and cannot fail. Anchored because 'undecided' contains
 * 'decided'.
 */
const waitForUndecided = async () => {
  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent(/^undecided$/);
  });
};

const findTrigger = () => screen.findByRole('button', { name: 'cookie preferences' });

describe('ConsentCursorTrigger', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('is hidden while the visitor is undecided', async () => {
    renderTrigger();
    await waitForUndecided();
    expect(screen.queryByRole('button', { name: 'cookie preferences' })).not.toBeInTheDocument();
  });

  it('appears once a decision exists', async () => {
    writeConsent(false);
    renderTrigger();
    expect(await findTrigger()).toBeInTheDocument();
  });

  it('opens the preferences dialog state on click', async () => {
    writeConsent(false);
    renderTrigger();
    await userEvent.click(await findTrigger());
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('keeps a 44px minimum hit area', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.className).toContain('h-11');
  });

  it('keeps a 44px minimum hit width for the caret-sized block', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.className).toContain('min-w-11');
  });

  // A transparent label still occupies its box, and that box sits inside the
  // button — so a fading-only label left an invisible strip of clickable page
  // beside the caret. Collapsing the width takes the region away with it.
  it('collapses the label box while it is hidden', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('max-w-0');
  });

  it('expands the label box on hover', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('group-hover:max-w-24');
  });

  it('expands the label box on keyboard focus', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('group-focus-visible:max-w-24');
  });

  // Without it the collapsing box would wrap the word mid-transition.
  it('keeps the label on one line while it collapses', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('whitespace-nowrap');
  });

  it('reveals the label on hover', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('group-hover:opacity-100');
  });

  it('reveals the label on keyboard focus', async () => {
    writeConsent(true);
    renderTrigger();
    await findTrigger();
    expect(screen.getByText('cookies').className).toContain('group-focus-visible:opacity-100');
  });

  it('scopes the label reveal to the button as hover group', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.className.split(' ')).toContain('group');
  });

  // The site's typewriter caret blinks; this one is its steady twin. A blink
  // pinned to every page is a vestibular hazard, so guard against one creeping
  // back in on the button or either span.
  it('renders a steady block with no blink animation', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.outerHTML).not.toContain('animate');
  });
});
