/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { sendGAEvent } from '@next/third-parties/google';

import { trackEvent } from '@/lib/analytics';

vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

describe('trackEvent', () => {
  it('forwards the event name and params to gtag when GA is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    trackEvent('request_quote_click', { service: 'ai-enablement' });
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'request_quote_click', {
      service: 'ai-enablement',
    });
  });

  it('does nothing when the measurement id is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    trackEvent('newsletter_signup', {});
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});
