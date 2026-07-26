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
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'open picker' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'select services' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
