/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { PageView } from '@/components/blocks/page-view';
import type { Page } from '@/payload-types';

// The Hero reads Site settings, so it is an async Server Component, which a
// client render cannot await. Its own spec covers it; here it only has to
// be recognisable as the thing that took the heading.
vi.mock('@/components/blocks/hero', () => ({
  Hero: ({ isPageHeading }: { isPageHeading: boolean }) =>
    isPageHeading ? <h1>the Hero&apos;s heading</h1> : <h2>the Hero&apos;s heading</h2>,
}));

const page = (overrides: Partial<Page>): Page =>
  ({
    _status: 'published',
    blocks: [],
    command: 'cat ./uses.md',
    id: 'page-1',
    intro: 'What I use.',
    slug: 'uses',
    title: 'uses',
    ...overrides,
  }) as Page;

describe('PageView', () => {
  it('heads the Page with its command line, title and intro', () => {
    render(<PageView page={page({})} />);

    expect(screen.getByText('cat ./uses.md')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'uses' })).toBeInTheDocument();
    expect(screen.getByText('What I use.')).toBeInTheDocument();
  });

  it('shows the title alone when the Page has no command line or intro', () => {
    render(<PageView page={page({ command: null, intro: null })} />);

    expect(screen.getByRole('banner')).toHaveTextContent(/^# uses$/);
  });

  it('shows the Blocks in the order the owner arranged them', () => {
    render(
      <PageView
        page={page({
          blocks: [
            { blockType: 'chipList', chips: ['first'], command: 'one' },
            { blockType: 'chipList', chips: ['second'], command: 'two' },
          ],
        })}
      />
    );

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      '$ one',
      '$ two',
    ]);
  });

  /** A Page that opens with a Hero has one main heading, and it is the Hero's. */
  it('leaves its own heading out when the Page opens with a Hero', () => {
    render(<PageView page={page({ blocks: [{ blockType: 'hero' }], title: 'home' })} />);

    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      "the Hero's heading",
    ]);
  });

  it('keeps its own heading when a Hero comes later in the Page', () => {
    render(
      <PageView
        page={page({
          blocks: [{ blockType: 'chipList', chips: ['x'] }, { blockType: 'hero' }],
        })}
      />
    );

    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      '# uses',
    ]);
  });

  it('shows a Page of CV Blocks as a document', () => {
    const { container } = render(
      <PageView
        page={page({
          blocks: [{ blockType: 'cvSummary', heading: 'Summary', text: 'Ten years.' }],
          title: 'Owner Name',
        })}
      />
    );

    expect(container.firstChild).toHaveClass('cv-document');
    // The CV's title is a name, so it carries no leading `#`.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Owner Name$/);
  });

  it('shows any other Page at the full width', () => {
    const { container } = render(<PageView page={page({})} />);

    expect(container.firstChild).not.toHaveClass('cv-document');
  });

  it('shows a Page with no Blocks as its heading alone', () => {
    render(<PageView page={page({ blocks: null })} />);

    expect(screen.getByRole('heading', { level: 1, name: 'uses' })).toBeInTheDocument();
  });

  /**
   * The date is the last publish, never one the owner types, so the policy
   * cannot claim to be newer or older than it is (docs/adr/0002).
   */
  it('says when the privacy Page was last published', () => {
    render(<PageView page={page({ slug: 'privacy', updatedAt: '2026-08-02T15:04:05.000Z' })} />);

    expect(screen.getByRole('banner')).toHaveTextContent('What I use. Last updated 2026-08-02.');
  });

  it('marks that date up as a date', () => {
    render(<PageView page={page({ slug: 'privacy', updatedAt: '2026-08-02T15:04:05.000Z' })} />);

    expect(screen.getByText('2026-08-02')).toHaveAttribute('datetime', '2026-08-02');
  });

  it('says so even when the privacy Page has no intro', () => {
    render(
      <PageView
        page={page({ intro: null, slug: 'privacy', updatedAt: '2026-08-02T15:04:05.000Z' })}
      />
    );

    expect(screen.getByRole('banner')).toHaveTextContent('Last updated 2026-08-02.');
  });

  it('puts no date on any other Page', () => {
    render(<PageView page={page({ updatedAt: '2026-08-02T15:04:05.000Z' })} />);

    expect(screen.getByRole('banner')).not.toHaveTextContent('Last updated');
  });
});
