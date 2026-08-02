/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render } from '@testing-library/react';

import { ConsentModeScript } from '@/components/consent/consent-mode-script';
import { CONSENT_MODE_BOOTSTRAP } from '@/lib/consent/gtag';

describe('ConsentModeScript', () => {
  it('inlines the consent mode bootstrap verbatim', () => {
    const { container } = render(<ConsentModeScript />);
    expect(container.querySelector('script')?.innerHTML).toBe(CONSENT_MODE_BOOTSTRAP);
  });
});
