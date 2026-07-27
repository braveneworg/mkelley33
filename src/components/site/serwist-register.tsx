/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import type { ReactNode } from 'react';

import { SerwistProvider } from '@serwist/next/react';

export const SerwistRegister = ({ children }: { children: ReactNode }) => (
  <SerwistProvider disable={process.env.NODE_ENV !== 'production'} swUrl="/sw.js">
    {children}
  </SerwistProvider>
);
