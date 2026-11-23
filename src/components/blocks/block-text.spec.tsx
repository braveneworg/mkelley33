/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, within } from '@testing-library/react';

import { BlockText } from '@/components/blocks/block-text';
import {
  autolink,
  BOLD,
  bullets,
  docLink,
  heading,
  link,
  pageLink,
  paragraph,
  richText,
  text,
} from '@/test/lexical';

const usesPage = { _status: 'published', id: 'page-1', slug: 'uses' };

describe('BlockText', () => {
  it('shows a paragraph the owner wrote', () => {
    render(<BlockText data={richText(paragraph('Analytics never runs before you allow it.'))} />);

    expect(screen.getByText('Analytics never runs before you allow it.')).toBeInTheDocument();
  });

  it('keeps what the owner made bold', () => {
    render(<BlockText data={richText(paragraph(text('hosting', BOLD), ' — Vercel serves it.'))} />);

    expect(screen.getByText('hosting').tagName).toBe('STRONG');
  });

  /** The marks in front are decoration; a screen reader hears the words. */
  it('names a heading by its words, not by the marks in front of it', () => {
    render(<BlockText data={richText(heading('h2', 'retention'))} />);

    expect(screen.getByRole('heading', { level: 2, name: 'retention' })).toBeInTheDocument();
  });

  it('marks a heading with one # for each level', () => {
    render(<BlockText data={richText(heading('h3', 'essential'))} />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('### essential');
  });

  /** The Page's own heading is the one main heading (see `PageHeading`). */
  it('shows a top-level heading typed into the text one level down', () => {
    render(<BlockText data={richText(heading('h1', 'who'))} />);

    expect(screen.getByRole('heading', { level: 2, name: 'who' })).toBeInTheDocument();
  });

  it('shows a list as a list', () => {
    render(<BlockText data={richText(bullets(['ask for access'], ['lodge a complaint']))} />);

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('opens an outside address in a new tab without handing over the opener', () => {
    const body = richText(
      paragraph('See the ', link('https://policies.google.com/privacy', 'google privacy policy'))
    );

    render(<BlockText data={body} />);

    const anchor = screen.getByRole('link', { name: /^google privacy policy/ });
    expect(anchor).toHaveAttribute('href', 'https://policies.google.com/privacy');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('says aloud that an outside address opens a new tab', () => {
    render(<BlockText data={richText(paragraph(link('https://example.com', 'the docs')))} />);

    expect(screen.getByRole('link')).toHaveAccessibleName(/\(opens in new tab\)$/);
  });

  it('treats an address the editor linked by itself the same way', () => {
    render(<BlockText data={richText(paragraph(autolink('https://example.com')))} />);

    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  it('keeps an address on this site in the same tab', () => {
    render(<BlockText data={richText(paragraph('Use the ', link('/contact', 'contact form')))} />);

    const anchor = screen.getByRole('link', { name: 'contact form' });
    expect(anchor).toHaveAttribute('href', '/contact');
    expect(anchor).not.toHaveAttribute('target');
  });

  it('follows a link to a Page to wherever the Page now lives', () => {
    render(<BlockText data={richText(paragraph(pageLink(usesPage, 'what I use')))} />);

    expect(screen.getByRole('link', { name: 'what I use' })).toHaveAttribute('href', '/uses');
  });

  /** Hidden the way a menu item is: the words stay, the link does not. */
  it('shows the words without a link when the Page is unpublished', () => {
    const draft = { ...usesPage, _status: 'draft' };

    render(<BlockText data={richText(paragraph(pageLink(draft, 'what I use')))} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('what I use')).toBeInTheDocument();
  });

  /** A deleted Page leaves only its id behind. */
  it('shows the words without a link when the Page is gone', () => {
    render(<BlockText data={richText(paragraph(pageLink('page-that-is-gone', 'what I use')))} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('what I use')).toBeInTheDocument();
  });

  /** The editor offers every kind of record; only a Page has an address of its own here. */
  it('shows the words without a link when it points at something that is not a Page', () => {
    const post = { _status: 'published', id: 'post-1', slug: 'first-post' };

    render(<BlockText data={richText(paragraph(docLink('posts', post, 'my first post')))} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('my first post')).toBeInTheDocument();
  });

  it('shows the words without a link when the link has no address', () => {
    render(<BlockText data={richText(paragraph(link('', 'nowhere')))} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('nowhere')).toBeInTheDocument();
  });
});
