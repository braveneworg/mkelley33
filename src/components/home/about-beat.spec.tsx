/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { AboutBeat } from '@/components/home/about-beat';

describe('AboutBeat', () => {
  it('renders the bio and interests line', () => {
    render(<AboutBeat headshotSrc={null} />);
    expect(screen.getByText('cat ./about.md')).toBeInTheDocument();
    expect(screen.getByText(/10\+ years shipping production React/)).toBeInTheDocument();
    expect(screen.getByText(/music, meditation/)).toBeInTheDocument();
  });

  it('renders a placeholder while the headshot is pending', () => {
    render(<AboutBeat headshotSrc={null} />);
    // The comment glyph is decorative, so only the plain text is exposed.
    expect(screen.getByText('headshot: pending')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('defaults the headshot to siteConfig.headshot when no prop is passed', () => {
    render(<AboutBeat />);
    expect(screen.getByText('headshot: pending')).toBeInTheDocument();
  });

  it('renders the headshot image when supplied', () => {
    render(<AboutBeat headshotSrc="/headshot.jpg" />);
    expect(screen.getByRole('img', { name: 'Michaux Kelley' })).toBeInTheDocument();
    expect(screen.queryByText('headshot: pending')).not.toBeInTheDocument();
  });
});
