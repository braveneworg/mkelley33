/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { findPageDraft, findPublishedPage } from '@/collections/published-page';
import { pageLink, paragraph, richText } from '@/test/lexical';
import { createTestPayload } from '@/test/payload-harness';

import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

// Every test starts from an empty database and arranges what it needs.
beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

const publish = (slug: string, title = slug) =>
  payload.create({
    collection: 'pages',
    data: { _status: 'published', blocks: [], slug, title },
  });

const saveDraft = (slug: string, title = slug) =>
  payload.create({ collection: 'pages', data: { blocks: [], slug, title }, draft: true });

/** What the admin's Unpublish button does: the record itself goes back to draft. */
const unpublish = (id: string, title: string) =>
  payload.update({ collection: 'pages', data: { _status: 'draft', title }, id });

const owner = () =>
  payload.create({
    collection: 'users',
    data: { email: 'owner@example.test', password: 'a-long-test-password' },
  });

describe('the Pages collection', () => {
  it('shows a visitor only the published Pages', async () => {
    await saveDraft('uses');
    await publish('cv');

    const { docs } = await payload.find({ collection: 'pages', overrideAccess: false });

    expect(docs.map(({ slug }) => slug)).toEqual(['cv']);
  });

  it('refuses an address the site itself already serves', async () => {
    await expect(publish('admin')).rejects.toThrow();
  });

  it('refuses a nested address', async () => {
    await expect(publish('blog/first')).rejects.toThrow();
  });

  it('refuses a second Page at an address that is taken', async () => {
    await publish('uses');

    await expect(publish('uses')).rejects.toThrow();
  });

  it('refuses to move a Fixed Page', async () => {
    const { id } = await publish('blog');

    await expect(
      payload.update({ collection: 'pages', data: { slug: 'writing' }, id })
    ).rejects.toThrow();
  });

  it('lets the owner edit a Fixed Page without moving it', async () => {
    const { id } = await publish('blog');

    const updated = await payload.update({
      collection: 'pages',
      data: { slug: 'blog', title: 'writing' },
      id,
    });

    expect(updated.title).toBe('writing');
  });

  it('lets the owner move any other Page', async () => {
    const { id } = await publish('uses');

    const moved = await payload.update({ collection: 'pages', data: { slug: 'gear' }, id });

    expect(moved.slug).toBe('gear');
  });

  it('refuses to delete a Fixed Page, even for the owner', async () => {
    const { id } = await publish('contact');
    const user = await owner();

    await expect(
      payload.delete({ collection: 'pages', id, overrideAccess: false, user })
    ).rejects.toThrow();
  });

  it('lets the owner delete any other Page', async () => {
    const { id } = await publish('uses');
    const user = await owner();

    await payload.delete({ collection: 'pages', id, overrideAccess: false, user });

    await expect(payload.count({ collection: 'pages' })).resolves.toEqual({ totalDocs: 0 });
  });
});

describe('the Page visitors are served', () => {
  it('is the published Page at that address', async () => {
    await publish('uses', 'what I use');

    await expect(findPublishedPage(payload, 'uses')).resolves.toMatchObject({
      slug: 'uses',
      title: 'what I use',
    });
  });

  it('is nothing while the Page has only ever been a draft', async () => {
    await saveDraft('uses');

    await expect(findPublishedPage(payload, 'uses')).resolves.toBeNull();
  });

  it('is nothing at an address no Page has', async () => {
    await expect(findPublishedPage(payload, 'uses')).resolves.toBeNull();
  });

  /** The owner's unpublished edit must not leak onto the site. */
  it('stays the published version while a newer draft exists', async () => {
    const { id } = await publish('uses', 'published title');
    await payload.update({
      collection: 'pages',
      data: { title: 'draft title' },
      draft: true,
      id,
    });

    await expect(findPublishedPage(payload, 'uses')).resolves.toMatchObject({
      title: 'published title',
    });
  });

  /** The privacy Page shows this date as "last updated" (docs/adr/0002). */
  it('keeps the date of the last publish while a newer draft exists', async () => {
    const { id, updatedAt } = await publish('uses');
    await payload.update({ collection: 'pages', data: { title: 'draft' }, draft: true, id });

    await expect(findPublishedPage(payload, 'uses')).resolves.toMatchObject({ updatedAt });
  });

  it('keeps the date of the last publish for a Fixed Page that was unpublished', async () => {
    const { id, updatedAt } = await publish('blog');
    await unpublish(id, 'edited while unpublished');

    await expect(findPublishedPage(payload, 'blog')).resolves.toMatchObject({ updatedAt });
  });

  /** The owner's decision of 2026-11-23: a Fixed Page cannot be taken off the site. */
  it('stays the last published version of a Fixed Page that was unpublished', async () => {
    const { id } = await publish('blog', 'published title');
    await unpublish(id, 'edited while unpublished');

    await expect(findPublishedPage(payload, 'blog')).resolves.toMatchObject({
      slug: 'blog',
      title: 'published title',
    });
  });

  /** A Fixed Page saved only as a draft has no published version to fall back on. */
  it('is nothing for a Fixed Page that has only ever been a draft', async () => {
    await saveDraft('blog');

    await expect(findPublishedPage(payload, 'blog')).resolves.toBeNull();
  });

  it('is nothing once any other Page is unpublished', async () => {
    const { id } = await publish('uses', 'published title');
    await unpublish(id, 'edited while unpublished');

    await expect(findPublishedPage(payload, 'uses')).resolves.toBeNull();
  });
});

describe('the Page the owner previews', () => {
  it('is the newest draft, published or not', async () => {
    const { id } = await publish('uses', 'published title');
    await payload.update({
      collection: 'pages',
      data: { title: 'draft title' },
      draft: true,
      id,
    });

    await expect(findPageDraft(payload, 'uses')).resolves.toMatchObject({ title: 'draft title' });
  });

  it('is nothing at an address no Page has', async () => {
    await expect(findPageDraft(payload, 'uses')).resolves.toBeNull();
  });
});

describe("a link in a Terminal's text", () => {
  const publishWithText = (slug: string, body: ReturnType<typeof richText>) =>
    payload.create({
      collection: 'pages',
      data: {
        _status: 'published',
        blocks: [{ blockType: 'terminal', body, pictureStyle: 'plain' }],
        slug,
        title: slug,
      },
    });

  /** The renderer needs the Page itself to know its address and whether it is published. */
  it('reads back with the Page it points at', async () => {
    const { id } = await publish('uses');
    await publishWithText('cv', richText(paragraph(pageLink(id, 'what I use'))));

    const page = await findPublishedPage(payload, 'cv');

    expect(JSON.stringify(page?.blocks)).toContain('"slug":"uses"');
  });
});
