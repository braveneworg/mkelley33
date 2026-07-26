'use client';

import type { ComponentPropsWithoutRef } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';

const DIALOG_CONTENT_CLASSES =
  'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-edge bg-surface p-6 focus:outline-none';

const DIALOG_TITLE_CLASSES =
  'font-mono text-lg font-bold text-phosphor';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-canvas/80" />
      <DialogPrimitive.Content
        className={
          className
            ? `${DIALOG_CONTENT_CLASSES} ${className}`
            : DIALOG_CONTENT_CLASSES
        }
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={
        className
          ? `${DIALOG_TITLE_CLASSES} ${className}`
          : DIALOG_TITLE_CLASSES
      }
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}
