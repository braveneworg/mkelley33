/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Switch } from '@/components/ui/switch';

const LabelledByFixture = () => (
  <>
    <h3 id="analytics-heading">analytics</h3>
    <Switch
      checked={false}
      label="off"
      labelledBy="analytics-heading"
      onCheckedChange={() => undefined}
    />
  </>
);

describe('Switch', () => {
  it('exposes an accessible checkbox named by its label', () => {
    render(<Switch checked={false} label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'analytics' })).not.toBeChecked();
  });

  // A control named by the state it happens to be in ('on', 'off') announces
  // as "off checkbox" and says nothing about what is off. `labelledBy` points
  // the name at whatever names the purpose instead.
  it('takes its accessible name from the referenced element', () => {
    render(<LabelledByFixture />);
    expect(screen.getByRole('checkbox', { name: 'analytics' })).toBeInTheDocument();
  });

  it('hides the visible state text from the accessibility tree', () => {
    render(<LabelledByFixture />);
    expect(screen.getByText('off')).toHaveAttribute('aria-hidden', 'true');
  });

  it('still toggles when the visible state text is clicked', async () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <h3 id="analytics-heading">analytics</h3>
        <Switch
          checked={false}
          label="off"
          labelledBy="analytics-heading"
          onCheckedChange={onCheckedChange}
        />
      </>
    );
    await userEvent.click(screen.getByText('off'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
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
