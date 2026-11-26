/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { SiteAnchor, SiteLink } from '@/components/blocks/site-link';

describe('SiteLink', () => {
  it('links to a Page on this site in the same tab', () => {
    render(<SiteLink link={{ external: false, href: '/uses', label: 'uses' }} />);

    const link = screen.getByRole('link', { name: 'uses' });
    expect(link).toHaveAttribute('href', '/uses');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens an outside address in a new tab without handing over the opener', () => {
    render(<SiteLink link={{ external: true, href: 'https://example.com', label: 'docs' }} />);

    const link = screen.getByRole('link', { name: /^docs/ });
    expect(link).toHaveAccessibleName(/\(opens in new tab\)$/);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('SiteAnchor', () => {
  it('puts an arrow after an outside address when asked to', () => {
    render(
      <SiteAnchor arrow external href="https://example.com">
        docs
      </SiteAnchor>
    );

    expect(screen.getByRole('link')).toHaveTextContent(/^docs\u2060↗/);
  });

  /** The arrow is decoration: the spoken hint already says the link leaves. */
  it('keeps the arrow out of what a screen reader hears', () => {
    render(
      <SiteAnchor arrow external href="https://example.com">
        docs
      </SiteAnchor>
    );

    expect(screen.getByRole('link')).toHaveAccessibleName(/^docs ?\(opens in new tab\)$/);
  });

  it('shows no arrow unless asked to', () => {
    render(
      <SiteAnchor external href="https://example.com">
        docs
      </SiteAnchor>
    );

    expect(screen.getByRole('link')).not.toHaveTextContent('↗');
  });

  it('puts no arrow after an address on this site', () => {
    render(
      <SiteAnchor arrow external={false} href="/uses">
        uses
      </SiteAnchor>
    );

    expect(screen.getByRole('link')).toHaveTextContent(/^uses$/);
  });
});
