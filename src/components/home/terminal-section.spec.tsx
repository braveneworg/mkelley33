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
});
