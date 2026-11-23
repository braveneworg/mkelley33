/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { Terminal } from '@/components/blocks/terminal';
import type { Media, TerminalBlock } from '@/payload-types';

const paragraph = (text: string): TerminalBlock['body'] => ({
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

const headshot: Media = {
  alt: 'The owner, smiling',
  createdAt: '',
  height: 400,
  id: 'media-1',
  updatedAt: '',
  url: '/api/media/file/headshot.webp',
  width: 400,
};

const block = (overrides: Partial<TerminalBlock> = {}): TerminalBlock => ({
  blockType: 'terminal',
  body: paragraph('I build things for the web.'),
  command: 'cat ./about.md',
  pictureStyle: 'plain',
  ...overrides,
});

describe('Terminal', () => {
  it('shows the text the owner wrote under its command line', () => {
    render(<Terminal block={block()} />);

    expect(screen.getByRole('heading', { name: 'cat ./about.md' })).toBeInTheDocument();
    expect(screen.getByText('I build things for the web.')).toBeInTheDocument();
  });

  it('shows no picture when none is set', () => {
    render(<Terminal block={block()} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('describes the picture with the alt text from the Media library', () => {
    render(<Terminal block={block({ picture: headshot })} />);

    expect(screen.getByRole('img', { name: 'The owner, smiling' })).toBeInTheDocument();
  });

  it('crops the picture to a circle in the round-portrait style', () => {
    render(<Terminal block={block({ picture: headshot, pictureStyle: 'roundPortrait' })} />);

    expect(screen.getByRole('img')).toHaveClass('rounded-full');
  });

  it('leaves the picture as uploaded in the plain style', () => {
    render(<Terminal block={block({ picture: headshot })} />);

    expect(screen.getByRole('img')).not.toHaveClass('rounded-full');
  });

  /** A deleted upload leaves only its id on the Block. */
  it('shows no picture when the upload could not be resolved', () => {
    render(<Terminal block={block({ picture: 'media-that-is-gone' })} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
