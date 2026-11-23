/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { BlockSection } from '@/components/blocks/block-section';

describe('BlockSection', () => {
  it('shows the command line as the heading of the section', () => {
    render(<BlockSection command="ls ./services">body</BlockSection>);

    expect(screen.getByRole('heading', { level: 2, name: 'ls ./services' })).toBeInTheDocument();
  });

  it('shows no heading when the owner left the command line empty', () => {
    render(<BlockSection command="">body</BlockSection>);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows what it was given', () => {
    render(<BlockSection>the body</BlockSection>);

    expect(screen.getByText('the body')).toBeInTheDocument();
  });
});
