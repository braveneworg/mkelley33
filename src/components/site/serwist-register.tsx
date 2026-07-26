'use client';

import type { ReactNode } from 'react';

import { SerwistProvider } from '@serwist/next/react';

export const SerwistRegister = ({ children }: { children: ReactNode }) => (
  <SerwistProvider disable={process.env.NODE_ENV !== 'production'} swUrl="/sw.js">
    {children}
  </SerwistProvider>
);
