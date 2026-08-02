/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuoteCta } from '@/components/services/quote-cta';
import { trackEvent } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

describe('QuoteCta', () => {
  it('links to the contact form with the service slug', () => {
    render(<QuoteCta service="ai-enablement" />);
    expect(screen.getByRole('link', { name: /request a quote/i })).toHaveAttribute(
      'href',
      '/contact?reason=services&service=ai-enablement'
    );
  });

  it('tracks the quote click with the service slug', async () => {
    const user = userEvent.setup();
    render(<QuoteCta service="ai-enablement" />);
    await user.click(screen.getByRole('link', { name: /request a quote/i }));
    expect(trackEvent).toHaveBeenCalledWith('request_quote_click', {
      service: 'ai-enablement',
    });
  });
});
