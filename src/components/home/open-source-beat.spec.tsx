/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { OpenSourceBeat } from '@/components/home/open-source-beat';
import type * as SiteConfigModule from '@/lib/site-config';

describe('OpenSourceBeat', () => {
  it('renders this site, boudreaux, and contributions entries', () => {
    render(<OpenSourceBeat />);
    expect(screen.getByText('ls ./open-source')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this-site\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33'
    );
    expect(screen.getByRole('link', { name: /boudreaux\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/boudreaux'
    );
    expect(screen.getByText(/react-starter-kit/)).toBeInTheDocument();
    expect(screen.getByText(/mean\.io/)).toBeInTheDocument();
  });

  it('renders this-site as plain text when no repo url is configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/site-config', async (importOriginal) => {
      const actual = await importOriginal<typeof SiteConfigModule>();
      return { siteConfig: { ...actual.siteConfig, repoUrl: null } };
    });
    const { OpenSourceBeat: Unlinked } = await import('@/components/home/open-source-beat');

    render(<Unlinked />);

    expect(screen.queryByRole('link', { name: /this-site\// })).not.toBeInTheDocument();
    expect(screen.getByText('this-site/')).toBeInTheDocument();
    vi.doUnmock('@/lib/site-config');
  });
});
