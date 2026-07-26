import type { ComponentPropsWithoutRef } from 'react';

import Link from 'next/link';

export const BUTTON_LINK_CLASSES =
  'inline-block rounded border border-phosphor px-4 py-2 font-mono text-sm text-phosphor transition-colors hover:bg-phosphor hover:text-canvas';

export function ButtonLink({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      className={
        className ? `${BUTTON_LINK_CLASSES} ${className}` : BUTTON_LINK_CLASSES
      }
      {...props}
    />
  );
}
