/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render } from '@testing-library/react';

import { GoogleAnalyticsTag } from '@/components/site/google-analytics-tag';

const gaProps = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: Record<string, unknown>) => {
    gaProps.current = props;
    return null;
  },
}));

describe('GoogleAnalyticsTag', () => {
  afterEach(() => {
    gaProps.current = null;
    vi.unstubAllEnvs();
  });

  it('renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    render(<GoogleAnalyticsTag />);
    expect(gaProps.current).toBeNull();
  });

  it('passes the measurement id to the GA script when set', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    render(<GoogleAnalyticsTag />);
    expect(gaProps.current?.gaId).toBe('G-TEST123');
  });
});
