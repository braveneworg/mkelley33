/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentCookieTrigger } from '@/components/consent/consent-cookie-trigger';
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
      <ConsentCookieTrigger />
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

/**
 * The sticky element is the button's wrapper, not the button: sticky
 * positioning resolves against the wrapper's parent (`<main>`), and only a
 * tall parent gives the control room to ride the viewport before parking.
 * Throws rather than asserting, so a missing wrapper reads as a broken
 * fixture instead of a confusing class-name diff.
 */
const findStickyWrapper = async (): Promise<HTMLElement> => {
  const { parentElement } = await findTrigger();
  if (parentElement === null) {
    throw new Error('the trigger rendered without its sticky wrapper');
  }
  return parentElement;
};

/**
 * Exact class membership, not a substring: `sticky` is a substring of nothing
 * here today, but `fixed`, `bottom-3`, and `mt-auto` all live one prefix away
 * from classes a future edit could add, and a substring check would keep
 * passing on the wrong one.
 */
const findWrapperClasses = async (): Promise<string[]> =>
  (await findStickyWrapper()).className.split(' ');

const findIconClass = async (): Promise<string> => {
  const icon = (await findTrigger()).querySelector('svg');
  if (icon === null) {
    throw new Error('the trigger rendered without its cookie icon');
  }
  const iconClass = icon.getAttribute('class');
  if (iconClass === null) {
    throw new Error('the cookie icon rendered without a class attribute');
  }
  return iconClass;
};

describe('ConsentCookieTrigger', () => {
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

  it('keeps a 44px minimum hit width for the icon-sized button', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.className).toContain('min-w-11');
  });

  // Sticky, not fixed: the control belongs to the content column, so it rides
  // the viewport while there is content left to scroll and then parks at the
  // end of it — never floating over the footer.
  it('sticks the wrapper to the content instead of the viewport', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findWrapperClasses()).toContain('sticky');
  });

  it('pins the sticky wrapper near the bottom edge', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findWrapperClasses()).toContain('bottom-3');
  });

  // Sticky `bottom` can lift an element but never push it down, so on a page
  // shorter than the viewport the wrapper would otherwise sit directly under
  // the content, mid-column, above an empty stretch of stretched-out `main`.
  // `mt-auto` is what drops it to the bottom of that flex column.
  it('drops the wrapper to the bottom of a short page', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findWrapperClasses()).toContain('mt-auto');
  });

  // The whole point of the revision: a viewport-fixed control floated over the
  // footer, so a reintroduced `fixed` is the specific regression to catch.
  it('never falls back to viewport-fixed positioning', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findWrapperClasses()).not.toContain('fixed');
  });

  // The wrapper spans the whole content column so the button lines up with the
  // page gutter; left clickable it would be a full-width strip swallowing
  // clicks meant for the content beside it.
  it('keeps the full-width wrapper from intercepting clicks', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findWrapperClasses()).toContain('pointer-events-none');
  });

  it('restores pointer events on the button itself', async () => {
    writeConsent(true);
    renderTrigger();
    expect((await findTrigger()).className).toContain('pointer-events-auto');
  });

  // The cookie is the whole visual; its meaning lives on the button's
  // aria-label, matching how every other glyph in this codebase is handled.
  it('hides the cookie icon from assistive tech', async () => {
    writeConsent(true);
    renderTrigger();
    expect((await findTrigger()).querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('tints the cookie icon from the text color', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findIconClass()).toContain('fill-current');
  });

  it('paints the cookie in phosphor green', async () => {
    writeConsent(true);
    renderTrigger();
    expect(await findIconClass()).toContain('text-phosphor');
  });

  // A transparent label still occupies its box, and that box sits inside the
  // button — so a fading-only label left an invisible strip of clickable page
  // beside the cookie. Collapsing the width takes the region away with it.
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

  // A control that sits on every page must not move on its own: an animated
  // cookie riding the scroll is a vestibular hazard, so guard against one
  // creeping back in on the button, the icon, or the label.
  it('renders a steady control with no blink animation', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await findTrigger();
    expect(trigger.outerHTML).not.toContain('animate');
  });

  // The button's guard stops at its own subtree, and the wrapper is the
  // positioned element — a float-in or slide-up would be attached here, on the
  // box that actually moves.
  it('renders a steady wrapper with no entrance animation', async () => {
    writeConsent(true);
    renderTrigger();
    expect((await findStickyWrapper()).className).not.toContain('animate');
  });
});
