import { render, screen } from '@testing-library/react';

import { Reveal } from '@/components/motion/reveal';

beforeAll(() => {
  class MockIntersectionObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: MockIntersectionObserver,
  });
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(
      <Reveal>
        <p>beat content</p>
      </Reveal>,
    );
    expect(screen.getByText('beat content')).toBeInTheDocument();
  });
});
