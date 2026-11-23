/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { BlockSection } from '@/components/blocks/block-section';

vi.mock('@/components/motion/reveal', () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reveal">{children}</div>
  ),
}));

describe('BlockSection', () => {
  it('shows the command line as the heading of the section', () => {
    render(<BlockSection command="ls ./services">body</BlockSection>);

    expect(screen.getByRole('heading', { level: 2, name: 'ls ./services' })).toBeInTheDocument();
  });

  it('shows no heading when the owner left the command line empty', () => {
    render(<BlockSection command="">body</BlockSection>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows what it was given', () => {
    render(<BlockSection>the body</BlockSection>);

    expect(screen.getByText('the body')).toBeInTheDocument();
  });

  it('fades a Block with a command line in as it scrolls into view', () => {
    render(<BlockSection command="ls ./services">the body</BlockSection>);

    expect(screen.getByTestId('reveal')).toHaveTextContent('the body');
  });

  /**
   * The body of a Page has to be there at once: it is printed, and a part
   * of it — the CV's history — can be taller than the screen, which the
   * scroll animation never counts as having come into view.
   */
  it('shows a Block without a command line at once, with no animation', () => {
    render(<BlockSection>the body</BlockSection>);

    expect(screen.queryByTestId('reveal')).not.toBeInTheDocument();
    expect(screen.getByText('the body')).toBeInTheDocument();
  });
});
