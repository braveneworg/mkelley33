import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { CopyButton } from '@/components/blog/copy-button';

describe('CopyButton', () => {
  it('copies the code and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<CopyButton code="pnpm dev" />);
    await user.click(screen.getByRole('button', { name: /copy code/i }));
    expect(writeText).toHaveBeenCalledWith('pnpm dev');
    await waitFor(() => expect(screen.getByText('copied ✓')).toBeInTheDocument());
  });
});
