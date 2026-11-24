/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { captureFiles, fingerprint, isCarriedPicture } from '@/lib/seed/capture-files';

const bytes = (content: string): Buffer => Buffer.from(content);

describe('captureFiles', () => {
  it('names a new file after the name it is stored under', () => {
    expect(captureFiles().add(bytes('one'), 'diagram.png')).toBe('files/diagram.png');
  });

  /** A Seed file name holds plain characters only, so it can name nothing outside `files/`. */
  it('tidies a stored name the Seed would not accept', () => {
    expect(captureFiles().add(bytes('one'), 'My Photo (final).JPG')).toBe(
      'files/My-Photo-final-.jpg'
    );
  });

  /**
   * Storage gives every upload a name of its own, so the stored name of a
   * picture the Seed already holds is not the name it has in the Seed.
   */
  it('keeps the name a file already has in the Seed', () => {
    const known = new Map([[fingerprint(bytes('one')), 'files/headshot.webp']]);

    expect(captureFiles(known).add(bytes('one'), 'headshot-718-KyOO.webp')).toBe(
      'files/headshot.webp'
    );
  });

  it('gives the same file the same name however often it is shown', () => {
    const files = captureFiles();
    const first = files.add(bytes('one'), 'a.png');

    expect(files.add(bytes('one'), 'a-copy.png')).toBe(first);
  });

  it('holds a file once however often it is shown', () => {
    const files = captureFiles();
    files.add(bytes('one'), 'a.png');
    files.add(bytes('one'), 'a-copy.png');

    expect([...files.all().keys()]).toEqual(['files/a.png']);
  });

  it('tells two files apart that would be given one name', () => {
    const files = captureFiles();
    files.add(bytes('one'), 'a b.png');

    expect(files.add(bytes('two'), 'a-b.png')).toBe('files/a-b-2.png');
  });

  it('does not give a new file the name of one the Seed holds', () => {
    const known = new Map([[fingerprint(bytes('old')), 'files/headshot.webp']]);
    const files = captureFiles(known);
    files.add(bytes('old'), 'headshot-718-KyOO.webp');

    expect(files.add(bytes('new'), 'headshot.webp')).toBe('files/headshot-2.webp');
  });

  it('holds the bytes of each file under its name', () => {
    const files = captureFiles();
    const name = files.add(bytes('one'), 'a.png');

    expect(files.all().get(name)?.toString()).toBe('one');
  });

  /** The Resume is served at one address, so its file has one name. */
  it('holds a file under a name the Seed fixes', () => {
    const files = captureFiles();
    files.addAs(bytes('a pdf'), 'files/michaux-kelley-resume.pdf');

    expect([...files.all().keys()]).toEqual(['files/michaux-kelley-resume.pdf']);
  });
});

describe('isCarriedPicture', () => {
  it('accepts a kind of picture the Seed carries', () => {
    expect(isCarriedPicture('headshot-718-KyOO.webp')).toBe(true);
  });

  it('accepts a picture whose name needs tidying', () => {
    expect(isCarriedPicture('My Photo.JPG')).toBe(true);
  });

  it('refuses a file that is not a picture', () => {
    expect(isCarriedPicture('michaux-kelley-resume.pdf')).toBe(false);
  });
});
