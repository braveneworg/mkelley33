import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { CommandPalette } from '@/components/palette/command-palette';

const push = vi.fn();
const setTheme = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // cmdk observes its list element for size changes; jsdom has no
  // ResizeObserver, so stub it for this suite.
  class MockResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
  globalThis.ResizeObserver = MockResizeObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  // A Response body is single-use; the palette fires one query per
  // keystroke, so each fetch call must get a fresh Response.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            results: [{ slug: 'create-a-nextjs-blog', title: 'Create a Next.js blog' }],
          }),
          { status: 200 }
        )
      )
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CommandPalette', () => {
  it('opens on meta+k and lists page entries', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('./services')).toBeInTheDocument();
    expect(screen.getByText('./uses')).toBeInTheDocument();
  });

  it('opens on the palette:open window event', async () => {
    render(<CommandPalette />);
    window.dispatchEvent(new Event('palette:open'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('navigates when a page entry is selected', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.click(await screen.findByText('./services'));
    expect(push).toHaveBeenCalledWith('/services');
  });

  it('searches posts once two characters are typed', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.type(screen.getByPlaceholderText('type a command or search…'), 'next');
    expect(await screen.findByText('Create a Next.js blog')).toBeInTheDocument();
    await user.click(screen.getByText('Create a Next.js blog'));
    expect(push).toHaveBeenCalledWith('/blog/create-a-nextjs-blog');
  });

  it('toggles the theme from the theme entry', async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    await user.keyboard('{Meta>}k{/Meta}');
    await user.click(screen.getByText(/toggle theme/));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
