/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CvDownloadLink } from '@/components/cv/cv-download-link';
import { trackEvent } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

describe('CvDownloadLink', () => {
  it('renders a download link to the pdf', () => {
    render(<CvDownloadLink resumePdf="/michaux-kelley-resume.pdf" />);
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      '/michaux-kelley-resume.pdf'
    );
  });

  it('tracks the download click', async () => {
    const user = userEvent.setup();
    render(<CvDownloadLink resumePdf="/michaux-kelley-resume.pdf" />);
    await user.click(screen.getByRole('link', { name: /download pdf/i }));
    expect(trackEvent).toHaveBeenCalledWith('cv_download', { format: 'pdf' });
  });
});
