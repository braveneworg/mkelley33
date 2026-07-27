/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

export const BUTTON_LINK_CLASSES =
  'inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas';

export const ButtonLink = ({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) => (
  <Link
    className={className ? `${BUTTON_LINK_CLASSES} ${className}` : BUTTON_LINK_CLASSES}
    {...props}
  />
);
