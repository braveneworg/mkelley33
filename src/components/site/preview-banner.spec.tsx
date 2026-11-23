/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { PreviewBanner } from '@/components/site/preview-banner';

describe('PreviewBanner', () => {
  it('says the page is showing unpublished changes', () => {
    render(<PreviewBanner />);

    expect(screen.getByRole('complementary', { name: 'Preview' })).toHaveTextContent(
      'previewing unpublished changes'
    );
  });

  it('offers the way out of the preview', () => {
    render(<PreviewBanner />);

    expect(screen.getByRole('link', { name: 'exit preview' })).toHaveAttribute(
      'href',
      '/preview/exit'
    );
  });
});
