import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SerwistRegister } from '@/components/site/serwist-register';

vi.mock('@serwist/next/react', () => ({
  SerwistProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
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
});
