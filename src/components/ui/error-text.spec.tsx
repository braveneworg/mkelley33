import { render, screen } from '@testing-library/react';

import { describedBy, ErrorText, FieldError } from '@/components/ui/error-text';

describe('ErrorText', () => {
  it('renders the message with id, role, and an aria-hidden prompt prefix', () => {
    render(
      <ErrorText id="err-1" role="alert" size="sm">
        something broke
      </ErrorText>
    );

    const paragraph = screen.getByRole('alert');
    expect(paragraph).toHaveAttribute('id', 'err-1');
    expect(paragraph).toHaveClass('text-sm');
    expect(paragraph).toHaveTextContent('something broke');
    expect(paragraph.querySelector('[aria-hidden="true"]')).toHaveTextContent('#');
  });

  it('defaults to the xs size and omits id and role when not given', () => {
    render(<ErrorText>terse</ErrorText>);

    const paragraph = screen.getByText('terse').closest('p');
    expect(paragraph).toHaveClass('text-xs');
    expect(paragraph).not.toHaveAttribute('id');
    expect(paragraph).not.toHaveAttribute('role');
  });

  it('appends a caller className to its own classes', () => {
    render(<ErrorText className="mt-1">spaced</ErrorText>);

    expect(screen.getByText('spaced').closest('p')).toHaveClass('font-mono', 'text-xs', 'mt-1');
  });
});

describe('FieldError', () => {
  it('renders the message when one is present', () => {
    render(<FieldError id="err-2" message="required" />);

    expect(screen.getByText('required').closest('p')).toHaveAttribute('id', 'err-2');
  });

  it('renders nothing when the message is absent', () => {
    const { container } = render(<FieldError id="err-3" message={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('describedBy', () => {
  it('returns the id when the field has an error', () => {
    expect(describedBy(true, 'err-4')).toBe('err-4');
  });

  it('returns undefined when the field has no error', () => {
    expect(describedBy(false, 'err-4')).toBeUndefined();
  });
});
