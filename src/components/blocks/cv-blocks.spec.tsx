/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { CvEntries } from '@/components/blocks/cv-entries';
import { CvExperience } from '@/components/blocks/cv-experience';
import { CvSkills } from '@/components/blocks/cv-skills';
import { CvSummary } from '@/components/blocks/cv-summary';

describe('CvSummary', () => {
  it('shows the text under its heading', () => {
    render(
      <CvSummary
        block={{ blockType: 'cvSummary', heading: 'Professional summary', text: 'Ten years.' }}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Professional summary' })
    ).toBeInTheDocument();
    expect(screen.getByText('Ten years.')).toBeInTheDocument();
  });
});

describe('CvSkills', () => {
  it('lists each group with what is in it', () => {
    render(
      <CvSkills
        block={{
          blockType: 'cvSkills',
          groups: [{ items: 'TypeScript, Python', label: 'Languages' }],
          heading: 'Technical skills',
        }}
      />
    );

    expect(screen.getByRole('term')).toHaveTextContent('Languages');
    expect(screen.getByRole('definition')).toHaveTextContent('TypeScript, Python');
  });
});

describe('CvExperience', () => {
  const entry = {
    bullets: [{ text: 'Shipped the thing.' }, { text: 'Tested the thing.' }],
    end: 'present',
    location: 'Remote',
    org: 'Example Co',
    role: 'Senior Engineer',
    start: '2021',
  };

  it('shows each role with where and when', () => {
    render(
      <CvExperience
        block={{ blockType: 'cvExperience', entries: [entry], heading: 'Experience' }}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Senior Engineer' })).toBeInTheDocument();
    expect(screen.getByText('Example Co · Remote · 2021–present')).toBeInTheDocument();
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

    expect(screen.getByText('Example Co · 2021–present')).toBeInTheDocument();
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
});

describe('CvEntries', () => {
  it('shows an item with its detail', () => {
    render(
      <CvEntries
        block={{
          blockType: 'cvEntries',
          heading: 'Education',
          items: [{ detail: 'A university', title: 'B.A., English' }],
        }}
      />
    );

    expect(screen.getByText('B.A., English')).toHaveClass('font-bold');
    expect(screen.getByText('A university')).toBeInTheDocument();
  });

  it('shows an item that is a single line', () => {
    render(
      <CvEntries
        block={{ blockType: 'cvEntries', heading: 'Open source', items: [{ title: 'A project' }] }}
      />
    );

    expect(screen.getByText('A project')).not.toHaveClass('font-bold');
  });
});
