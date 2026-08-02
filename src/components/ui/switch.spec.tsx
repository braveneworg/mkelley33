/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Switch } from '@/components/ui/switch';

describe('Switch', () => {
  it('exposes an accessible checkbox named by its label', () => {
    render(<Switch checked={false} label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'analytics' })).not.toBeChecked();
  });

  it('reports the next checked state on click', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} label="analytics" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'analytics' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles from the keyboard when focused', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} label="analytics" onCheckedChange={onCheckedChange} />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows the filled glyph when checked', () => {
    render(<Switch checked label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByText('[■]')).toBeInTheDocument();
  });

  it('shows the empty glyph when unchecked', () => {
    render(<Switch checked={false} label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByText('[ ]')).toBeInTheDocument();
  });

  it('does not fire when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked disabled label="always on" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByText('always on'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
