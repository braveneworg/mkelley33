/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { TerminalSection } from '@/components/home/terminal-section';

describe('TerminalSection', () => {
  it('renders the prompt command and children', () => {
    render(
      <TerminalSection command="cat ./about.md">
        <p>hello</p>
      </TerminalSection>
    );
    expect(screen.getByText('cat ./about.md')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('renders the command as a level-2 heading', () => {
    render(
      <TerminalSection command="cat ./about.md">
        <p>hello</p>
      </TerminalSection>
    );
    expect(screen.getByRole('heading', { level: 2, name: 'cat ./about.md' })).toBeInTheDocument();
  });
});
