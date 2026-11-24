/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import {
  pagesLinkedInText,
  picturesInText,
  richTextSchema,
  toSeedText,
  toStoredText,
} from '@/lib/seed/seed-text';
import type { SeedRefs } from '@/lib/seed/seed-text';
import { bullets, docLink, link, paragraph, richText } from '@/test/lexical';

/** A picture inside text, as the editor stores it: the id of a Media upload. */
const upload = (value: unknown, relationTo = 'media') => ({
  fields: null,
  format: '',
  id: 'node-1',
  relationTo,
  type: 'upload',
  value,
  version: 3,
});

/** A card for another record inside text, which the Seed does not carry. */
const relationship = {
  format: '',
  relationTo: 'posts',
  type: 'relationship',
  value: 'post-1',
  version: 2,
};

const HEADSHOT = { alt: 'the owner', file: 'files/headshot.webp' };

describe('toStoredText', () => {
  const refs = {
    pageIds: new Map([['contact', 'id-of-contact']]),
    upload: vi.fn().mockResolvedValue('id-of-upload'),
  };

  it('points a link at the id of the Page the Seed names by address', async () => {
    const stored = await toStoredText(
      richText(paragraph('Say ', docLink('pages', 'contact', 'hello'))),
      refs
    );

    expect(stored).toEqual(richText(paragraph('Say ', docLink('pages', 'id-of-contact', 'hello'))));
  });

  it('finds a link however deep in the text it sits', async () => {
    const stored = await toStoredText(
      richText(bullets([docLink('pages', 'contact', 'hello')])),
      refs
    );

    expect(stored).toEqual(richText(bullets([docLink('pages', 'id-of-contact', 'hello')])));
  });

  it('leaves a link to a typed address as it is', async () => {
    const body = richText(paragraph(link('https://example.com', 'elsewhere')));

    await expect(toStoredText(body, refs)).resolves.toEqual(body);
  });

  /** The fill creates a link's target first, so this is a fault in its order. */
  it('refuses a link to a Page that does not exist yet', async () => {
    const body = richText(paragraph(docLink('pages', 'cv', 'my CV')));

    await expect(toStoredText(body, refs)).rejects.toThrow(
      'a link in the text points at the cv Page, which does not exist yet'
    );
  });

  it('uploads a picture the text shows and points at the upload', async () => {
    const stored = await toStoredText(richText(upload(HEADSHOT)), refs);

    expect(stored).toEqual(richText(upload('id-of-upload')));
  });

  it('uploads the file the Seed names, with its alt text', async () => {
    const uploadPicture = vi.fn().mockResolvedValue('id-of-upload');

    await toStoredText(richText(upload(HEADSHOT)), { ...refs, upload: uploadPicture });

    expect(uploadPicture).toHaveBeenCalledWith(HEADSHOT);
  });

  it('keeps whatever else the text carries', async () => {
    const body = { ...richText(paragraph('plain')), extra: 'kept' };

    await expect(toStoredText(body, refs)).resolves.toEqual(body);
  });
});

describe('toSeedText', () => {
  const leftOut: string[] = [];
  const refs: SeedRefs = {
    leftOut: (what) => {
      leftOut.push(what);
    },
    pageSlug: (id) => new Map([['id-of-contact', 'contact']]).get(id),
    picture: (id) => Promise.resolve(id === 'id-of-upload' ? HEADSHOT : null),
  };

  beforeEach(() => {
    leftOut.length = 0;
  });

  it('names the Page a link points at by its address', async () => {
    const seed = await toSeedText(
      richText(paragraph('Say ', docLink('pages', 'id-of-contact', 'hello'))),
      refs
    );

    expect(seed).toEqual(richText(paragraph('Say ', docLink('pages', 'contact', 'hello'))));
  });

  it('names the Page of a link that a read has resolved', async () => {
    const seed = await toSeedText(
      richText(paragraph(docLink('pages', { id: 'id-of-contact', slug: 'contact' }, 'hello'))),
      refs
    );

    expect(seed).toEqual(richText(paragraph(docLink('pages', 'contact', 'hello'))));
  });

  /** Visitors see the words without the link, so that is what the Seed holds. */
  it('keeps the words of a link whose Page visitors are not served', async () => {
    const seed = await toSeedText(
      richText(paragraph('Read ', docLink('pages', 'id-of-draft', 'the ', 'draft'), '.')),
      refs
    );

    expect(seed).toEqual(richText(paragraph('Read ', 'the ', 'draft', '.')));
  });

  it('says which link it left out', async () => {
    await toSeedText(richText(paragraph(docLink('pages', 'id-of-draft', 'the ', 'draft'))), refs);

    expect(leftOut).toEqual([
      'the link on "the draft": it points at a Page that is not published, or at another kind of record',
    ]);
  });

  it('keeps the words of a link to another kind of record', async () => {
    const seed = await toSeedText(
      richText(paragraph(docLink('posts', 'id-of-contact', 'a post'))),
      refs
    );

    expect(seed).toEqual(richText(paragraph('a post')));
  });

  it('names the file and alt text of a picture the text shows', async () => {
    const seed = await toSeedText(richText(upload('id-of-upload')), refs);

    expect(seed).toEqual(richText(upload(HEADSHOT)));
  });

  it('leaves out a picture whose upload it cannot carry', async () => {
    const seed = await toSeedText(richText(paragraph('before'), upload('gone')), refs);

    expect(seed).toEqual(richText(paragraph('before')));
  });

  it('says that it left a picture out', async () => {
    await toSeedText(richText(upload('gone')), refs);

    expect(leftOut).toEqual([
      'a picture in the text: its upload is gone, or is not a kind of picture the Seed carries',
    ]);
  });

  it('leaves out an upload that is not in the Media library', async () => {
    const seed = await toSeedText(richText(upload('id-of-upload', 'resume-files')), refs);

    expect(seed).toEqual(richText());
  });

  it('leaves out a card for another record', async () => {
    const seed = await toSeedText(richText(paragraph('before'), relationship), refs);

    expect(seed).toEqual(richText(paragraph('before')));
  });

  it('says that it left a card out', async () => {
    await toSeedText(richText(relationship), refs);

    expect(leftOut).toEqual(['a card for another record in the text']);
  });

  it('leaves a link to a typed address as it is', async () => {
    const body = richText(paragraph(link('/contact', 'hello')));

    await expect(toSeedText(body, refs)).resolves.toEqual(body);
  });
});

describe('pagesLinkedInText', () => {
  it('lists the Pages the text links to, by address', () => {
    const body = richText(
      paragraph(docLink('pages', 'contact', 'hello')),
      bullets([docLink('pages', 'cv', 'my CV')], [link('https://example.com', 'elsewhere')])
    );

    expect(pagesLinkedInText(body)).toEqual(['contact', 'cv']);
  });
});

describe('picturesInText', () => {
  it('lists the pictures the text shows', () => {
    expect(picturesInText(richText(paragraph('before'), upload(HEADSHOT)))).toEqual([HEADSHOT]);
  });
});

describe('richTextSchema', () => {
  it('accepts text with a link to a Page by address and a picture by file', () => {
    const body = richText(paragraph(docLink('pages', 'contact', 'hello')), upload(HEADSHOT));

    expect(richTextSchema.safeParse(body).success).toBe(true);
  });

  /** A database id means nothing in another database. */
  it('rejects a link to another kind of record', () => {
    const body = richText(paragraph(docLink('posts', 'a-post', 'a post')));

    expect(richTextSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a link to something that could not be a Page address', () => {
    const body = richText(paragraph(docLink('pages', 'Not An Address', 'hello')));

    expect(richTextSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a picture that names no file in the Seed', () => {
    expect(richTextSchema.safeParse(richText(upload('64f0c0ffee64f0c0ffee64f0'))).success).toBe(
      false
    );
  });

  it('rejects a picture from outside the Media library', () => {
    expect(richTextSchema.safeParse(richText(upload(HEADSHOT, 'resume-files'))).success).toBe(
      false
    );
  });

  it('rejects a card for another record', () => {
    expect(richTextSchema.safeParse(richText(relationship)).success).toBe(false);
  });

  it('rejects text without the frame the editor stores', () => {
    expect(richTextSchema.safeParse({ root: { children: [] } }).success).toBe(false);
  });
});
