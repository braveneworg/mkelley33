import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SerwistRegister } from '@/components/site/serwist-register';

const providerProps = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

vi.mock('@serwist/next/react', () => ({
  SerwistProvider: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
    providerProps.current = props;
    return <>{children}</>;
  },
}));

describe('SerwistRegister', () => {
  it('renders its children through the provider', () => {
    render(
      <SerwistRegister>
        <p>child</p>
      </SerwistRegister>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('points the provider at /sw.js and disables it outside production', () => {
    render(
      <SerwistRegister>
        <p>child</p>
      </SerwistRegister>
    );
    expect(providerProps.current?.swUrl).toBe('/sw.js');
    // vitest defines NODE_ENV as 'test', so the non-production guard holds.
    expect(providerProps.current?.disable).toBe(true);
  });
});
