/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { sendGAEvent } from '@next/third-parties/google';

import { trackEvent } from '@/lib/analytics';
import { writeConsent } from '@/lib/consent/consent-storage';

vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

describe('trackEvent', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('forwards the event when GA is configured and consent is granted', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(true);
    trackEvent('request_quote_click', { service: 'ai-enablement' });
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'request_quote_click', {
      service: 'ai-enablement',
    });
  });

  it('does nothing when the measurement id is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    writeConsent(true);
    trackEvent('newsletter_signup', {});
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('drops events while consent is undecided', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    trackEvent('newsletter_signup', {});
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('drops events when analytics consent was declined', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(false);
    trackEvent('cv_download', { format: 'pdf' });
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});
