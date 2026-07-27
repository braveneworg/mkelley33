/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render } from '@testing-library/react';

import {
  installPaletteHotkey,
  PALETTE_HOTKEY_SCRIPT,
  PaletteHotkey,
} from '@/components/palette/palette-hotkey';

const pressHotkey = (init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    cancelable: true,
    key: 'k',
    metaKey: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
};

// Each install attaches window listeners that only detach on palette:ready
// — dispatch it after every test so no listener leaks into the next one.
afterEach(() => {
  window.dispatchEvent(new Event('palette:ready'));
});

describe('installPaletteHotkey', () => {
  it('buffers a pre-hydration press and replays it on palette:ready', () => {
    const opened = vi.fn();
    window.addEventListener('palette:open', opened);
    installPaletteHotkey();

    const event = pressHotkey();

    expect(event.defaultPrevented).toBe(true);
    expect(opened).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('palette:ready'));
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener('palette:open', opened);
  });

  it('buffers ctrl+k for non-mac keyboards', () => {
    const opened = vi.fn();
    window.addEventListener('palette:open', opened);
    installPaletteHotkey();

    const event = pressHotkey({ ctrlKey: true, metaKey: false });

    expect(event.defaultPrevented).toBe(true);
    window.dispatchEvent(new Event('palette:ready'));
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener('palette:open', opened);
  });

  it('does not open the palette when no press was buffered', () => {
    const opened = vi.fn();
    window.addEventListener('palette:open', opened);
    installPaletteHotkey();

    window.dispatchEvent(new Event('palette:ready'));

    expect(opened).not.toHaveBeenCalled();
    window.removeEventListener('palette:open', opened);
  });

  it('ignores presses without a modifier', () => {
    const opened = vi.fn();
    window.addEventListener('palette:open', opened);
    installPaletteHotkey();

    const event = pressHotkey({ metaKey: false });

    expect(event.defaultPrevented).toBe(false);
    window.dispatchEvent(new Event('palette:ready'));
    expect(opened).not.toHaveBeenCalled();
    window.removeEventListener('palette:open', opened);
  });

  it('hands the hotkey off once the palette is ready', () => {
    const opened = vi.fn();
    window.addEventListener('palette:open', opened);
    installPaletteHotkey();
    window.dispatchEvent(new Event('palette:ready'));

    const event = pressHotkey();

    // After handoff the palette's own listener owns the hotkey: the bridge
    // must neither swallow the press nor replay it on a later ready event.
    expect(event.defaultPrevented).toBe(false);
    window.dispatchEvent(new Event('palette:ready'));
    expect(opened).not.toHaveBeenCalled();
    window.removeEventListener('palette:open', opened);
  });
});

describe('PaletteHotkey', () => {
  it('renders the installer as an inline script', () => {
    const { container } = render(<PaletteHotkey />);
    const script = container.querySelector('script');
    expect(script?.innerHTML).toBe(PALETTE_HOTKEY_SCRIPT);
    expect(PALETTE_HOTKEY_SCRIPT).toContain('palette:open');
    expect(PALETTE_HOTKEY_SCRIPT).toContain('palette:ready');
  });
});
