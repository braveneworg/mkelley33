import { render, screen } from '@testing-library/react';

import { Reveal } from '@/components/motion/reveal';

import type * as MotionReact from 'motion/react';

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
      </Reveal>
    );
    expect(screen.getByText('beat content')).toBeInTheDocument();
  });

  it('renders a plain wrapper with no animation when motion is reduced', async () => {
    vi.resetModules();
    vi.doMock('motion/react', async (importOriginal) => ({
      ...(await importOriginal<typeof MotionReact>()),
      useReducedMotion: () => true,
    }));
    const { Reveal: ReducedReveal } = await import('@/components/motion/reveal');

    render(
      <ReducedReveal delay={0.4}>
        <p>static content</p>
      </ReducedReveal>
    );

    const wrapper = screen.getByText('static content').parentElement;
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper).not.toHaveAttribute('style');
    vi.doUnmock('motion/react');
  });
});
