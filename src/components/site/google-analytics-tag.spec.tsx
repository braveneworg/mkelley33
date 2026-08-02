/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, waitFor } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';
import { GoogleAnalyticsTag } from '@/components/site/google-analytics-tag';
import { writeConsent } from '@/lib/consent/consent-storage';

const gaProps = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: Record<string, unknown>) => {
    gaProps.current = props;
    return null;
  },
}));

const renderTag = () =>
  render(
    <ConsentProvider>
      <GoogleAnalyticsTag />
    </ConsentProvider>
  );

describe('GoogleAnalyticsTag', () => {
  afterEach(() => {
    gaProps.current = null;
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset even with consent', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('renders nothing while consent is undecided', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('renders nothing when analytics consent was declined', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(false);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('passes the measurement id to the GA script once consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current?.gaId).toBe('G-TEST123');
    });
  });
});
