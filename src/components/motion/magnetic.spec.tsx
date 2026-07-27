/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Magnetic } from '@/components/motion/magnetic';

const setters: ReturnType<typeof vi.fn>[] = [];
let reduced = false;

vi.mock('motion/react', () => ({
  motion: {
    span: ({ children, style: _style, ...props }: { children: ReactNode; style?: unknown }) => (
      <span {...props}>{children}</span>
    ),
  },
  useMotionValue: () => {
    const set = vi.fn();
    setters.push(set);
    return { get: () => 0, set };
  },
  useReducedMotion: () => reduced,
  useSpring: (value: unknown) => value,
}));

beforeEach(() => {
  setters.length = 0;
  reduced = false;
});

const renderMagnetic = () =>
  render(
    <Magnetic>
      <a href="/blog">Read the blog →</a>
    </Magnetic>
  );

describe('Magnetic', () => {
  it('renders its children', () => {
    renderMagnetic();
    expect(screen.getByRole('link', { name: 'Read the blog →' })).toBeInTheDocument();
  });

  it('offsets toward the pointer, scaled and relative to the element centre', () => {
    renderMagnetic();
    const span = screen.getByRole('link').parentElement as HTMLElement;
    vi.spyOn(span, 'getBoundingClientRect').mockReturnValue({
      height: 100,
      left: 0,
      top: 0,
      width: 100,
    } as DOMRect);

    fireEvent.pointerMove(span, { clientX: 75, clientY: 25 });

    const [setX, setY] = setters;
    expect(setX).toHaveBeenCalledWith(5); // (75 - 0 - 50) * 0.2
    expect(setY).toHaveBeenCalledWith(-5); // (25 - 0 - 50) * 0.2
  });

  it('springs back to centre when the pointer leaves', () => {
    renderMagnetic();
    const span = screen.getByRole('link').parentElement as HTMLElement;

    fireEvent.pointerLeave(span);

    const [setX, setY] = setters;
    expect(setX).toHaveBeenCalledWith(0);
    expect(setY).toHaveBeenCalledWith(0);
  });

  it('renders a static span with no pointer tracking when motion is reduced', () => {
    reduced = true;
    renderMagnetic();
    const span = screen.getByRole('link').parentElement as HTMLElement;

    fireEvent.pointerMove(span, { clientX: 75, clientY: 25 });

    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(setters.every((set) => set.mock.calls.length === 0)).toBe(true);
  });
});
