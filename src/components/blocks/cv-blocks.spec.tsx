/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen, within } from '@testing-library/react';

import { CvEntries } from '@/components/blocks/cv-entries';
import { CvExperience } from '@/components/blocks/cv-experience';
import { CvSkills } from '@/components/blocks/cv-skills';
import { CvSummary } from '@/components/blocks/cv-summary';
import { link, pageLink, paragraph, richText } from '@/test/lexical';

/** A line of the CV with nothing in it but words. */
const line = (words: string) => richText(paragraph(words));

/** A line of the CV that links its last words to another site. */
const lineWithOutsideLink = richText(
  paragraph('Built ', link('https://example.com/project', 'a project'))
);

const usesPage = { _status: 'published', id: 'page-1', slug: 'uses' };

/** A line of the CV that links its last words to a Page on this site. */
const lineWithPageLink = richText(paragraph('See ', pageLink(usesPage, 'what I use')));

/** The arrow that says a link leaves the site. */
const ARROW = '↗';

describe('CvSummary', () => {
  it('shows the text under its heading', () => {
    render(
      <CvSummary
        block={{
          blockType: 'cvSummary',
          heading: 'Professional summary',
          text: line('Ten years.'),
        }}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Professional summary' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ten years.')).toBeInTheDocument();
  });

  it('follows a link in the text to another site, and says so with an arrow', () => {
    render(
      <CvSummary
        block={{ blockType: 'cvSummary', heading: 'Summary', text: lineWithOutsideLink }}
      />
    );

    const anchor = screen.getByRole('link', { name: /^a project/ });
    expect(anchor).toHaveAttribute('href', 'https://example.com/project');
    expect(anchor).toHaveTextContent(ARROW);
  });

  it('follows a link in the text to a Page on this site, with no arrow', () => {
    render(
      <CvSummary block={{ blockType: 'cvSummary', heading: 'Summary', text: lineWithPageLink }} />
    );

    const anchor = screen.getByRole('link', { name: 'what I use' });
    expect(anchor).toHaveAttribute('href', '/uses');
    expect(anchor).not.toHaveTextContent(ARROW);
  });
});

describe('CvSkills', () => {
  it('lists each group with what is in it', () => {
    render(
      <CvSkills
        block={{
          blockType: 'cvSkills',
          groups: [{ items: line('TypeScript, Python'), label: 'Languages' }],
          heading: 'Technical skills',
        }}
      />
    );

    expect(screen.getByRole('term')).toHaveTextContent('Languages');
    expect(screen.getByRole('definition')).toHaveTextContent('TypeScript, Python');
  });

  it('marks a link in a group that leaves the site', () => {
    render(
      <CvSkills
        block={{
          blockType: 'cvSkills',
          groups: [{ items: lineWithOutsideLink, label: 'Languages' }],
          heading: 'Technical skills',
        }}
      />
    );

    expect(within(screen.getByRole('definition')).getByRole('link')).toHaveTextContent(ARROW);
  });
});

describe('CvExperience', () => {
  const entry = {
    bullets: [{ text: line('Shipped the thing.') }, { text: line('Tested the thing.') }],
    end: 'present',
    location: 'Remote',
    org: line('Example Co'),
    role: 'Senior Engineer',
    start: '2021',
  };

  it('shows each role with where and when', () => {
    render(
      <CvExperience
        block={{ blockType: 'cvExperience', entries: [entry], heading: 'Experience' }}
      />
    );

    const role = screen.getByRole('heading', { level: 3, name: 'Senior Engineer' });
    expect(role.nextElementSibling).toHaveTextContent(/^Example Co · Remote · 2021–present$/);
  });

  it('leaves the place out when the owner did', () => {
    render(
      <CvExperience
        block={{
          blockType: 'cvExperience',
          entries: [{ ...entry, location: '' }],
          heading: 'Experience',
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 3 }).nextElementSibling).toHaveTextContent(
      /^Example Co · 2021–present$/
    );
  });

  it('lists the points under the role', () => {
    render(
      <CvExperience
        block={{ blockType: 'cvExperience', entries: [entry], heading: 'Experience' }}
      />
    );

    expect(screen.getByText('Shipped the thing.')).toBeInTheDocument();
    expect(screen.getByText('Tested the thing.')).toBeInTheDocument();
  });

  it('shows a role that has no points', () => {
    render(
      <CvExperience
        block={{
          blockType: 'cvExperience',
          entries: [{ ...entry, bullets: [] }],
          heading: 'Experience',
        }}
      />
    );

    expect(screen.getAllByRole('list')).toHaveLength(1);
  });

  it('follows a link on the organisation, and marks one that leaves the site', () => {
    const org = richText(paragraph(link('https://example.com', 'Example Co')));

    render(
      <CvExperience
        block={{ blockType: 'cvExperience', entries: [{ ...entry, org }], heading: 'Experience' }}
      />
    );

    const anchor = screen.getByRole('link', { name: /^Example Co/ });
    expect(anchor).toHaveAttribute('href', 'https://example.com');
    expect(anchor).toHaveTextContent('↗');
  });

  it('marks a link in a point that leaves the site', () => {
    render(
      <CvExperience
        block={{
          blockType: 'cvExperience',
          entries: [{ ...entry, bullets: [{ text: lineWithOutsideLink }] }],
          heading: 'Experience',
        }}
      />
    );

    expect(screen.getByRole('link', { name: /^a project/ })).toHaveTextContent(ARROW);
  });
});

describe('CvEntries', () => {
  it('shows an item with its detail', () => {
    render(
      <CvEntries
        block={{
          blockType: 'cvEntries',
          heading: 'Education',
          items: [{ detail: line('A university'), title: line('B.A., English') }],
        }}
      />
    );

    expect(screen.getByText('B.A., English').closest('.font-bold')).not.toBeNull();
    expect(screen.getByText('A university')).toBeInTheDocument();
  });

  it('shows an item that is a single line', () => {
    render(
      <CvEntries
        block={{
          blockType: 'cvEntries',
          heading: 'Open source',
          items: [{ title: line('A project') }],
        }}
      />
    );

    expect(screen.getByText('A project').closest('.font-bold')).toBeNull();
  });

  /** The editor leaves an empty paragraph behind when its words are deleted. */
  it('treats a detail the owner emptied as no detail', () => {
    render(
      <CvEntries
        block={{
          blockType: 'cvEntries',
          heading: 'Open source',
          items: [{ detail: richText(paragraph()), title: line('A project') }],
        }}
      />
    );

    expect(screen.getByText('A project').closest('.font-bold')).toBeNull();
  });

  it('marks a link in an item that leaves the site', () => {
    render(
      <CvEntries
        block={{
          blockType: 'cvEntries',
          heading: 'Open source',
          items: [{ detail: lineWithOutsideLink, title: lineWithOutsideLink }],
        }}
      />
    );

    expect(screen.getAllByRole('link').map((anchor) => anchor.textContent.includes(ARROW))).toEqual(
      [true, true]
    );
  });
});
