import type { ReactNode } from 'react';

const SIZE_CLASSES = { sm: 'text-sm', xs: 'text-xs' } as const;

export interface ErrorTextProps {
  children: ReactNode;
  className?: string;
  id?: string;
  role?: 'alert' | 'status';
  size?: keyof typeof SIZE_CLASSES;
}

/**
 * Terminal-idiom inline message for form errors and server feedback: a muted
 * mono paragraph prefixed with an `aria-hidden` `#` so screen readers announce
 * the message without the decorative comment marker.
 */
export const ErrorText = ({ children, className, id, role, size = 'xs' }: ErrorTextProps) => {
  const classes = `text-fg-muted font-mono ${SIZE_CLASSES[size]}`;
  return (
    <p className={className ? `${classes} ${className}` : classes} id={id} role={role}>
      <span aria-hidden="true"># </span>
      {children}
    </p>
  );
};

export interface FieldErrorProps extends Omit<ErrorTextProps, 'children'> {
  message?: string;
}

/**
 * Renders an {@link ErrorText} only when there is a message, so callers stay
 * free of the `message ? … : null` branch at every field.
 */
export const FieldError = ({ message, ...props }: FieldErrorProps) =>
  message ? <ErrorText {...props}>{message}</ErrorText> : null;

/**
 * Resolves an `aria-describedby` target: the id when the field has an error,
 * otherwise `undefined` so the attribute is omitted.
 */
export const describedBy = (hasError: boolean, id: string): string | undefined =>
  hasError ? id : undefined;

/**
 * Unwraps a form field error's message, keeping call sites free of the
 * optional chain that would otherwise repeat at every field.
 */
export const fieldMessage = (error?: { message?: string }): string | undefined => error?.message;
