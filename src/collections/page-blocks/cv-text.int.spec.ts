/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { findPublishedPage } from '@/collections/published-page';
import { pageLink, paragraph, richText } from '@/test/lexical';
import { createTestPayload } from '@/test/payload-harness';

import type { MongooseAdapter } from '@payloadcms/db-mongodb';
import type { Payload } from 'payload';

let payload: Payload;
let reset: () => Promise<void>;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ payload, reset, teardown } = await createTestPayload());
}, 120_000);

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await teardown();
});

const SUMMARY = 'Ten years of shipping.';

const publishCv = (text = richText(paragraph(SUMMARY))) =>
  payload.create({
    collection: 'pages',
    data: {
      _status: 'published',
      blocks: [{ blockType: 'cvSummary', heading: 'Summary', text }],
      slug: 'cv',
      title: 'CV',
    },
  });

/**
 * Puts the summary back to the plain text the live site stored before these
 * fields took links — in the Page and in every version of it. A save through
 * Payload would write rich text, so only the stored records can be made to
 * look like the live ones (docs/lessons/payload/an-array-never-stored-reads-as-empty.md).
 */
const storeAsPlainText = async (): Promise<void> => {
  const { connection } = payload.db as MongooseAdapter;
  await connection.collection('pages').updateMany({}, { $set: { 'blocks.0.text': SUMMARY } });
  await connection
    .collection('_pages_versions')
    .updateMany({}, { $set: { 'version.blocks.0.text': SUMMARY } });
};

/** The summary of the CV as a read hands it over. */
const summaryOf = (page: { blocks?: unknown } | null): unknown => {
  const [block] = (page?.blocks ?? []) as { text?: unknown }[];
  return block?.text;
};

describe('text of the CV stored before it took links', () => {
  it('is served to visitors as rich text', async () => {
    await publishCv();
    await storeAsPlainText();

    const page = await findPublishedPage(payload, 'cv');

    expect(summaryOf(page)).toEqual(richText(paragraph(SUMMARY)));
  });

  it('is handed to the admin as rich text, for the editor to open', async () => {
    const { id } = await publishCv();
    await storeAsPlainText();

    const page = await payload.findByID({ collection: 'pages', draft: true, id });

    expect(summaryOf(page)).toEqual(richText(paragraph(SUMMARY)));
  });

  it('is rich text in an old version too', async () => {
    await publishCv();
    await storeAsPlainText();

    const { docs } = await payload.findVersions({ collection: 'pages' });

    expect(docs.map(({ version }) => summaryOf(version))).toEqual([richText(paragraph(SUMMARY))]);
  });

  /** A save that leaves the Blocks out must not trip over what they hold. */
  it('does not stop the owner changing something else on the Page', async () => {
    const { id } = await publishCv();
    await storeAsPlainText();

    const updated = await payload.update({ collection: 'pages', data: { title: 'Résumé' }, id });

    expect(updated.title).toBe('Résumé');
  });

  /** What the admin's Unpublish button sends. */
  it('does not stop the owner unpublishing the Page', async () => {
    const { id } = await publishCv();
    await storeAsPlainText();

    const updated = await payload.update({ collection: 'pages', data: { _status: 'draft' }, id });

    expect(updated._status).toBe('draft');
  });
});

describe('a link in the text of the CV', () => {
  it('comes back with the Page it points at, so the site can follow it', async () => {
    const uses = await payload.create({
      collection: 'pages',
      data: { _status: 'published', blocks: [], slug: 'uses', title: 'Uses' },
    });
    await publishCv(richText(paragraph('See ', pageLink(uses.id, 'what I use'))));

    const page = await findPublishedPage(payload, 'cv');

    expect(JSON.stringify(summaryOf(page))).toContain('"slug":"uses"');
  });
});
