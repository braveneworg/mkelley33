/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, waitFor } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';
import { VercelAnalyticsTag } from '@/components/site/vercel-analytics-tag';
import { writeConsent } from '@/lib/consent/consent-storage';

const analyticsRendered = vi.hoisted(() => ({ current: false }));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => {
    analyticsRendered.current = true;
    return null;
  },
}));

const renderTag = () =>
  render(
    <ConsentProvider>
      <VercelAnalyticsTag />
    </ConsentProvider>
  );

describe('VercelAnalyticsTag', () => {
  afterEach(() => {
    analyticsRendered.current = false;
    localStorage.clear();
  });

  it('renders nothing while consent is undecided', async () => {
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(false);
    });
  });

  it('renders nothing when analytics consent was declined', async () => {
    writeConsent(false);
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(false);
    });
  });

  it('mounts Vercel Analytics once consent is granted', async () => {
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(true);
    });
  });
});
