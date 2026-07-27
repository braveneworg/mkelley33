/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { ServicesBeat } from '@/components/home/services-beat';
import { SERVICES } from '@/lib/services-content';

describe('ServicesBeat', () => {
  it('renders a card per service linking to its anchor', () => {
    render(<ServicesBeat />);
    expect(screen.getByText('ls ./services')).toBeInTheDocument();
    for (const service of SERVICES) {
      expect(screen.getByRole('link', { name: new RegExp(`${service.slug}/`) })).toHaveAttribute(
        'href',
        `/services#${service.slug}`
      );
    }
  });
});
