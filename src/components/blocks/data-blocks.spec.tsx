/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from '@testing-library/react';

import { AllPosts } from '@/components/blocks/all-posts';
import { Contact } from '@/components/blocks/contact';
import { LatestPosts } from '@/components/blocks/latest-posts';
import { NewsletterSignup } from '@/components/blocks/newsletter-signup';
import { Picture } from '@/components/blocks/picture';
import { ResumeDownload } from '@/components/blocks/resume-download';
import { ServicesDetail } from '@/components/blocks/services-detail';
import { ServicesGrid } from '@/components/blocks/services-grid';
import { listPublishedPosts } from '@/lib/repositories/posts';
import { getSiteSettings } from '@/lib/repositories/site-settings';
import type { Media, Post } from '@/payload-types';

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: () => <div data-testid="turnstile" />,
}));

// The form shows the Services only once a visitor asks about them; what
// matters here is that the Block hands them over.
vi.mock('@/components/contact/contact-form', () => ({
  ContactForm: ({ services }: { services: { name: string; slug: string }[] }) => (
    <ul>
      {services.map(({ name, slug }) => (
        <li key={slug}>
          {slug}: {name}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock('@/lib/repositories/services', () => ({
  listServices: vi.fn(async () => [
    {
      credibility: 'Presented to hundreds of developers.',
      deliverables: ['A rollout plan'],
      name: 'AI engineering enablement',
      pitch: 'Bring AI-assisted development into your team.',
      slug: 'ai-enablement',
    },
  ]),
}));

vi.mock('@/lib/repositories/posts', () => ({ listPublishedPosts: vi.fn() }));
vi.mock('@/lib/repositories/site-settings', () => ({ getSiteSettings: vi.fn() }));

const post = (slug: string, publishedAt: string): Post =>
  ({ id: slug, publishedAt, slug, title: `Post ${slug}` }) as Post;

const POSTS = [
  post('four', '2026-04-01T00:00:00.000Z'),
  post('three', '2026-03-01T00:00:00.000Z'),
  post('two', '2026-02-01T00:00:00.000Z'),
  post('one', '2026-01-01T00:00:00.000Z'),
];

beforeEach(() => {
  vi.mocked(listPublishedPosts).mockResolvedValue(POSTS);
});

describe('ServicesGrid', () => {
  it('links a card for each Service to its detail', async () => {
    render(await ServicesGrid({ block: { blockType: 'servicesGrid', command: 'ls ./services' } }));

    expect(screen.getByRole('link', { name: /AI engineering enablement/ })).toHaveAttribute(
      'href',
      '/services#ai-enablement'
    );
  });
});

describe('ServicesDetail', () => {
  it('shows each Service in full', async () => {
    render(await ServicesDetail({ block: { blockType: 'servicesDetail' } }));

    expect(screen.getByText('Bring AI-assisted development into your team.')).toBeInTheDocument();
  });
});

describe('LatestPosts', () => {
  it('shows only as many Posts as the owner asked for, newest first', async () => {
    render(await LatestPosts({ block: { blockType: 'latestPosts', count: 2 } }));

    expect(screen.getAllByRole('link', { name: /^Post / }).map((a) => a.textContent)).toEqual([
      'Post four2026-04-01',
      'Post three2026-03-01',
    ]);
  });

  it('links on to the blog', async () => {
    render(await LatestPosts({ block: { blockType: 'latestPosts', count: 3 } }));

    expect(screen.getByRole('link', { name: 'all posts: ./blog →' })).toHaveAttribute(
      'href',
      '/blog'
    );
  });

  it('says so when nothing is published yet', async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);

    render(await LatestPosts({ block: { blockType: 'latestPosts', count: 3 } }));

    expect(screen.getByText('no posts yet')).toBeInTheDocument();
  });
});

describe('AllPosts', () => {
  it('lists every published Post', async () => {
    render(await AllPosts({ block: { blockType: 'postList' } }));

    expect(screen.getAllByRole('link', { name: /Post / })).toHaveLength(POSTS.length);
  });
});

describe('NewsletterSignup', () => {
  it('shows the intro above the form', () => {
    render(<NewsletterSignup block={{ blockType: 'newsletterSignup', intro: 'No spam.' }} />);

    expect(screen.getByText('No spam.')).toBeInTheDocument();
    expect(screen.getByLabelText('email')).toBeInTheDocument();
  });

  it('shows the form alone when there is no intro', () => {
    render(<NewsletterSignup block={{ blockType: 'newsletterSignup' }} />);

    expect(screen.getByLabelText('email')).toBeInTheDocument();
  });
});

describe('Contact', () => {
  it('offers the Services to ask about', async () => {
    render(await Contact({ block: { blockType: 'contactForm' } }));

    expect(screen.getByText('ai-enablement: AI engineering enablement')).toBeInTheDocument();
  });
});

describe('Picture', () => {
  const media: Media = {
    alt: 'A desk with a laptop',
    createdAt: '',
    id: 'media-1',
    updatedAt: '',
    url: '/api/media/file/desk.webp',
  };

  it('shows the picture with its alt text and caption', () => {
    render(<Picture block={{ blockType: 'picture', caption: 'Where it happens.', media }} />);

    expect(screen.getByRole('img', { name: 'A desk with a laptop' })).toBeInTheDocument();
    expect(screen.getByText('Where it happens.')).toBeInTheDocument();
  });

  it('shows the picture alone when there is no caption', () => {
    render(<Picture block={{ blockType: 'picture', media }} />);

    expect(screen.getByRole('figure')).toHaveTextContent('');
  });

  /** A deleted upload leaves only its id on the Block. */
  it('shows nothing when the upload could not be resolved', () => {
    const { container } = render(<Picture block={{ blockType: 'picture', media: 'gone' }} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('ResumeDownload', () => {
  it('links to the permanent address of the Resume', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({ resumeUrl: '/api/x.pdf' } as never);

    render(await ResumeDownload());

    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      '/michaux-kelley-resume.pdf'
    );
  });

  it('shows nothing when Site settings hold no Resume', async () => {
    vi.mocked(getSiteSettings).mockResolvedValue({ resumeUrl: null } as never);

    const { container } = render(await ResumeDownload());

    expect(container).toBeEmptyDOMElement();
  });
});
