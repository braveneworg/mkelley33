/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SiteNav } from '@/components/site/site-nav';

const pathnameHolder = { current: '/' };

/** The header menu as `getSiteSettings` hands it over: resolved, hidden items gone. */
const LINKS = [
  { external: false, href: '/', label: './home' },
  { external: false, href: '/blog', label: './blog' },
  { external: false, href: '/services', label: './services' },
  { external: false, href: '/cv', label: './cv' },
  { external: false, href: '/contact', label: './contact' },
];

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameHolder.current,
}));

describe('SiteNav', () => {
  beforeEach(() => {
    pathnameHolder.current = '/';
  });

  it('renders the logo linking home', () => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: '~/mkelley33' })).toHaveAttribute('href', '/');
  });

  it.each([
    ['./home', '/'],
    ['./blog', '/blog'],
    ['./services', '/services'],
    ['./cv', '/cv'],
    ['./contact', '/contact'],
  ])('renders %s linking to %s', (label, href) => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('marks the current route with aria-current', () => {
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: './home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './blog' })).not.toHaveAttribute('aria-current');
  });

  it('marks ./blog current on nested post routes', () => {
    pathnameHolder.current = '/blog/create-a-nextjs-blog';
    render(<SiteNav links={LINKS} />);
    expect(screen.getByRole('link', { name: './blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: './home' })).not.toHaveAttribute('aria-current');
  });

  /** The menu is the owner's: the header shows what it is given, in that order. */
  it('renders the links it is given and no others', () => {
    render(<SiteNav links={[{ external: false, href: '/uses', label: './uses' }]} />);

    expect(screen.getByRole('link', { name: './uses' })).toHaveAttribute('href', '/uses');
    expect(screen.queryByRole('link', { name: './blog' })).not.toBeInTheDocument();
  });

  it('opens an outside address in a new tab', () => {
    render(<SiteNav links={[{ external: true, href: 'https://example.com', label: 'docs' }]} />);

    const link = screen.getByRole('link', { name: /^docs/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/\(opens in new tab\)$/);
  });

  it('puts an arrow after a menu item that leaves the site', () => {
    render(<SiteNav links={[{ external: true, href: 'https://example.com', label: 'docs' }]} />);

    expect(screen.getByRole('link', { name: /^docs/ })).toHaveTextContent('↗');
  });

  it('puts no arrow after a menu item that stays on the site', () => {
    render(<SiteNav links={[{ external: false, href: '/uses', label: './uses' }]} />);

    expect(screen.getByRole('link', { name: './uses' })).not.toHaveTextContent('↗');
  });

  it('sticks to the top of the viewport above the scrolling content', () => {
    render(<SiteNav links={LINKS} />);

    expect(screen.getByRole('banner')).toHaveClass('sticky', 'top-0', 'z-30');
  });

  it('frosts the content that scrolls behind it', () => {
    render(<SiteNav links={LINKS} />);

    expect(screen.getByRole('banner')).toHaveClass('bg-canvas/80', 'backdrop-blur');
  });
});

describe('SiteNav mobile menu', () => {
  beforeEach(() => {
    pathnameHolder.current = '/';
  });

  it('starts closed', () => {
    render(<SiteNav links={LINKS} />);

    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('controls the menu that holds the links', () => {
    render(<SiteNav links={LINKS} />);

    const menuId = screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-controls');
    expect(document.getElementById(menuId ?? '')).toContainElement(
      screen.getByRole('link', { name: './blog' })
    );
  });

  it('is a green control shown only below the sm breakpoint', () => {
    render(<SiteNav links={LINKS} />);

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass(
      'text-phosphor',
      'sm:hidden'
    );
  });

  it('keeps the closed menu out of the tab order on small screens', () => {
    render(<SiteNav links={LINKS} />);

    const menuId = screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-controls');
    expect(document.getElementById(menuId ?? '')).toHaveClass('invisible', 'sm:visible');
  });

  it('opens on click', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('shows the menu once open', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);
    const button = screen.getByRole('button', { name: 'Open menu' });

    await user.click(button);

    expect(document.getElementById(button.getAttribute('aria-controls') ?? '')).toHaveClass(
      'visible'
    );
  });

  it('closes again on a second click', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('closes when a link in it is followed', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('link', { name: './blog' }));

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('hands focus back to the button on Escape', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.tab();
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('turns the bars into a cross while open', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);
    const button = screen.getByRole('button', { name: 'Open menu' });

    await user.click(button);

    expect(button.querySelector('[data-bar="top"]')).toHaveClass('rotate-45');
  });

  it('turns solid while open so the page does not show through the links', async () => {
    const user = userEvent.setup();
    render(<SiteNav links={LINKS} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('banner')).toHaveClass('bg-canvas', 'sm:bg-canvas/80');
  });
});
