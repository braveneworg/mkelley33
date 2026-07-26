import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

describe('Dialog', () => {
  it('opens from the trigger and closes from the close button', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open picker</DialogTrigger>
        <DialogContent>
          <DialogTitle>select services</DialogTitle>
          <p>body copy</p>
          <DialogClose>done</DialogClose>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'open picker' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'select services' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('merges caller className with the base classes', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open</DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogTitle className="uppercase">t</DialogTitle>
          <DialogClose>done</DialogClose>
        </DialogContent>
      </Dialog>
    );
    await user.click(screen.getByRole('button', { name: 'open' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-lg');
    expect(dialog).toHaveClass('bg-surface');
    const title = screen.getByRole('heading', { name: 't' });
    expect(title).toHaveClass('uppercase');
    expect(title).toHaveClass('text-phosphor');
  });
});
