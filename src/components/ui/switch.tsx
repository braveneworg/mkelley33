/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

const GLYPH_CLASSES =
  'text-phosphor peer-focus-visible:outline-phosphor font-mono text-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2';

/**
 * A native checkbox styled as an ASCII toggle — accessible by construction
 * (real input, label association, keyboard toggling for free).
 */
export const Switch = ({ checked, disabled = false, label, onCheckedChange }: SwitchProps) => (
  <label
    className={`flex items-center gap-2 font-mono text-sm ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    }`}
  >
    <input
      checked={checked}
      className="peer sr-only"
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
    <span aria-hidden="true" className={GLYPH_CLASSES}>
      {checked ? '[■]' : '[ ]'}
    </span>
    {label}
  </label>
);
