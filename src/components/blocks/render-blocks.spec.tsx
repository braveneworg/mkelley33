/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { PAGE_BLOCKS } from '@/collections/page-blocks';
import { type PageBlock, RenderBlocks } from '@/components/blocks/render-blocks';

/**
 * Each component has a spec of its own. This one is about the dispatch: the
 * right component for each kind, in order. So every component is replaced
 * by a paragraph carrying its own name — several are async Server
 * Components, which a client render could not await anyway.
 */

vi.mock('@/components/blocks/all-posts', () => ({ AllPosts: () => <p>AllPosts</p> }));
vi.mock('@/components/blocks/chip-list', () => ({ ChipList: () => <p>ChipList</p> }));
vi.mock('@/components/blocks/contact', () => ({ Contact: () => <p>Contact</p> }));
vi.mock('@/components/blocks/cookie-inventory', () => ({
  CookieInventory: () => <p>CookieInventory</p>,
}));
vi.mock('@/components/blocks/cv-entries', () => ({ CvEntries: () => <p>CvEntries</p> }));
vi.mock('@/components/blocks/cv-experience', () => ({ CvExperience: () => <p>CvExperience</p> }));
vi.mock('@/components/blocks/cv-skills', () => ({ CvSkills: () => <p>CvSkills</p> }));
vi.mock('@/components/blocks/cv-summary', () => ({ CvSummary: () => <p>CvSummary</p> }));
vi.mock('@/components/blocks/definition-list', () => ({
  DefinitionList: () => <p>DefinitionList</p>,
}));
vi.mock('@/components/blocks/hero', () => ({
  Hero: ({ isPageHeading }: { isPageHeading: boolean }) => (
    <p>{isPageHeading ? 'Hero as the Page heading' : 'Hero'}</p>
  ),
}));
vi.mock('@/components/blocks/latest-posts', () => ({ LatestPosts: () => <p>LatestPosts</p> }));
vi.mock('@/components/blocks/link-list', () => ({ LinkList: () => <p>LinkList</p> }));
vi.mock('@/components/blocks/manage-preferences', () => ({
  ManagePreferences: () => <p>ManagePreferences</p>,
}));
vi.mock('@/components/blocks/newsletter-signup', () => ({
  NewsletterSignup: () => <p>NewsletterSignup</p>,
}));
vi.mock('@/components/blocks/picture', () => ({ Picture: () => <p>Picture</p> }));
vi.mock('@/components/blocks/resume-download', () => ({
  ResumeDownload: () => <p>ResumeDownload</p>,
}));
vi.mock('@/components/blocks/services-detail', () => ({
  ServicesDetail: () => <p>ServicesDetail</p>,
}));
vi.mock('@/components/blocks/services-grid', () => ({ ServicesGrid: () => <p>ServicesGrid</p> }));
vi.mock('@/components/blocks/terminal', () => ({ Terminal: () => <p>Terminal</p> }));
vi.mock('@/components/blocks/timeline', () => ({ Timeline: () => <p>Timeline</p> }));

const block = (blockType: string): PageBlock => ({ blockType }) as PageBlock;

describe('RenderBlocks', () => {
  it.each([
    ['chipList', 'ChipList'],
    ['contactForm', 'Contact'],
    ['cookieInventory', 'CookieInventory'],
    ['cvEntries', 'CvEntries'],
    ['cvExperience', 'CvExperience'],
    ['cvSkills', 'CvSkills'],
    ['cvSummary', 'CvSummary'],
    ['definitionList', 'DefinitionList'],
    ['latestPosts', 'LatestPosts'],
    ['linkList', 'LinkList'],
    ['managePreferences', 'ManagePreferences'],
    ['newsletterSignup', 'NewsletterSignup'],
    ['picture', 'Picture'],
    ['postList', 'AllPosts'],
    ['resumeDownload', 'ResumeDownload'],
    ['servicesDetail', 'ServicesDetail'],
    ['servicesGrid', 'ServicesGrid'],
    ['terminal', 'Terminal'],
    ['timeline', 'Timeline'],
  ])('renders a %s Block with %s', (blockType, component) => {
    render(<RenderBlocks blocks={[block(blockType)]} />);

    expect(screen.getByText(component)).toBeInTheDocument();
  });

  /** The compiler holds this too; the spec says it where a reader will look. */
  it('has a component for every kind the admin offers', () => {
    render(<RenderBlocks blocks={PAGE_BLOCKS.map(({ slug }) => block(slug))} />);

    expect(screen.getAllByRole('paragraph')).toHaveLength(PAGE_BLOCKS.length);
  });

  it('keeps the order the owner arranged', () => {
    render(<RenderBlocks blocks={[block('timeline'), block('chipList'), block('terminal')]} />);

    expect(screen.getAllByRole('paragraph').map((p) => p.textContent)).toEqual([
      'Timeline',
      'ChipList',
      'Terminal',
    ]);
  });

  it('tells a Hero that opens the Page that it is the heading', () => {
    render(<RenderBlocks blocks={[block('hero'), block('chipList')]} />);

    expect(screen.getByText('Hero as the Page heading')).toBeInTheDocument();
  });

  it('tells a Hero further down that it is not', () => {
    render(<RenderBlocks blocks={[block('chipList'), block('hero')]} />);

    expect(screen.getByText('Hero')).toBeInTheDocument();
  });

  it('renders two Blocks of one kind that carry no id', () => {
    render(<RenderBlocks blocks={[block('chipList'), block('chipList')]} />);

    expect(screen.getAllByText('ChipList')).toHaveLength(2);
  });

  it('renders nothing for a Page with no Blocks', () => {
    const { container } = render(<RenderBlocks blocks={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
