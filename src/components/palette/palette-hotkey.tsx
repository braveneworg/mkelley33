/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Pre-hydration ⌘K / Ctrl+K bridge. The command palette ships as a
 * `dynamic(..., { ssr: false })` chunk, so its own keydown listener only
 * attaches after that chunk hydrates — until then the hotkey would be
 * silently dropped. This installer runs from an inline layout `<script>`
 * as the HTML parses (before any hydration): it buffers a press, and when
 * the palette announces itself via the `palette:ready` window event it
 * detaches and replays the buffered press as the palette's existing
 * `palette:open` event.
 *
 * Must stay self-contained (no outer-scope references): it is serialized
 * with `Function.prototype.toString` into {@link PALETTE_HOTKEY_SCRIPT}.
 */
export const installPaletteHotkey = (): void => {
  let pending = false;
  const onKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      pending = true;
    }
  };
  const onReady = (): void => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('palette:ready', onReady);
    if (pending) {
      window.dispatchEvent(new Event('palette:open'));
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('palette:ready', onReady);
};

export const PALETTE_HOTKEY_SCRIPT = `(${installPaletteHotkey.toString()})();`;

/**
 * Server-rendered inline script that installs the hotkey bridge. Rendered
 * at the top of the root layout body so the listener exists from the very
 * first parsed byte of the document.
 */
export const PaletteHotkey = () => (
  <script dangerouslySetInnerHTML={{ __html: PALETTE_HOTKEY_SCRIPT }} />
);
