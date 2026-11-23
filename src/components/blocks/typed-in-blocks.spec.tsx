/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { ChipList } from '@/components/blocks/chip-list';
import { DefinitionList } from '@/components/blocks/definition-list';
import { LinkList } from '@/components/blocks/link-list';
import { Timeline } from '@/components/blocks/timeline';
import type { Page } from '@/payload-types';

const page = (slug: string, status: 'draft' | 'published'): Page =>
  ({ _status: status, id: slug, slug, title: slug }) as Page;

describe('ChipList', () => {
  it('shows the intro and every chip', () => {
    render(
      <ChipList
        block={{ blockType: 'chipList', chips: ['Claude Code', 'MCP'], intro: 'What I use.' }}
      />
    );

    expect(screen.getByText('What I use.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Claude Code',
      'MCP',
    ]);
  });

  it('shows the chips alone when there is no intro', () => {
    render(<ChipList block={{ blockType: 'chipList', chips: ['MCP'] }} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});

describe('Timeline', () => {
  const entries = [
    { marker: 'a1b2c3d', period: '2021–present', title: 'Senior Engineer — Example Co' },
    { title: 'Engineer — Earlier Co' },
  ];

  it('lists the entries in the order the owner arranged them', () => {
    render(<Timeline block={{ blockType: 'timeline', entries }} />);

    const [first, second] = screen.getAllByRole('listitem');
    expect(first).toHaveTextContent('a1b2c3dSenior Engineer — Example Co2021–present');
    expect(second).toHaveTextContent('Engineer — Earlier Co');
  });

  it('links on to the Page set under the list', () => {
    render(
      <Timeline
        block={{
          blockType: 'timeline',
          entries,
          link: { label: 'full history: ./cv →', page: page('cv', 'published') },
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'full history: ./cv →' })).toHaveAttribute(
      'href',
      '/cv'
    );
  });

  /** The owner's decision of 2026-11-23: hidden, not a dead link. */
  it('hides the link while its Page is unpublished', () => {
    render(
      <Timeline
        block={{
          blockType: 'timeline',
          entries,
          link: { label: 'full history: ./cv →', page: page('cv', 'draft') },
        }}
      />
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('LinkList', () => {
  const items = [
    { description: 'A music marketplace.', label: 'boudreaux/', url: 'https://example.com/b' },
    { description: 'Assorted patches.', label: 'contributions/' },
  ];

  it('links an item that has an address, in a new tab', () => {
    render(<LinkList block={{ blockType: 'linkList', items }} />);

    expect(screen.getByRole('link', { name: /^boudreaux\// })).toHaveAttribute(
      'href',
      'https://example.com/b'
    );
  });

  it('shows an item without an address as plain text', () => {
    render(<LinkList block={{ blockType: 'linkList', items }} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('contributions/')).toBeInTheDocument();
  });

  it('shows each description', () => {
    render(<LinkList block={{ blockType: 'linkList', items }} />);

    expect(screen.getByText('A music marketplace.')).toBeInTheDocument();
  });
});

describe('DefinitionList', () => {
  const block = {
    blockType: 'definitionList' as const,
    heading: 'hardware/',
    items: [{ description: 'The daily driver.', term: 'MacBook Pro' }, { term: 'A desk' }],
  };

  it('heads the list', () => {
    render(<DefinitionList block={block} />);

    expect(screen.getByRole('heading', { level: 2, name: 'hardware/' })).toBeInTheDocument();
  });

  it('pairs each thing with its note', () => {
    render(<DefinitionList block={block} />);

    const pair = screen.getByText('MacBook Pro').parentElement;
    expect(pair).toHaveTextContent('MacBook ProThe daily driver.');
  });

  it('shows a thing with no note on its own', () => {
    render(<DefinitionList block={block} />);

    expect(screen.getAllByRole('definition')).toHaveLength(1);
    expect(screen.getByText('A desk')).toBeInTheDocument();
  });

  it('shows the list alone when it has no heading', () => {
    render(<DefinitionList block={{ blockType: 'definitionList', items: block.items }} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
  });
});

describe('LinkList without descriptions', () => {
  it('shows an item that is only a label', () => {
    render(<LinkList block={{ blockType: 'linkList', items: [{ label: 'a bare item' }] }} />);

    expect(screen.getByRole('listitem')).toHaveTextContent(/^a bare item$/);
  });
});
