/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { CvDocument } from '@/components/cv/cv-document';
import { CV_EDUCATION, CV_EXPERIENCE, CV_SKILLS } from '@/lib/cv-content';

describe('CvDocument', () => {
  it('renders summary, every skill group, every role, and education', () => {
    render(<CvDocument resumePdf={null} />);
    expect(screen.getByText(/Senior full-stack software engineer/)).toBeInTheDocument();
    for (const group of CV_SKILLS) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
    }
    for (const entry of CV_EXPERIENCE) {
      expect(screen.getByRole('heading', { name: entry.role })).toBeInTheDocument();
    }
    for (const item of CV_EDUCATION) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
  });

  it('hides the download button while the pdf is pending', () => {
    render(<CvDocument resumePdf={null} />);
    expect(screen.queryByRole('link', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it('shows the download button when the pdf exists', () => {
    render(<CvDocument resumePdf="/michaux-kelley-resume.pdf" />);
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      '/michaux-kelley-resume.pdf'
    );
  });
});
