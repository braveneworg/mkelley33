/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadSeed, servicesSeedSchema, siteSettingsSeedSchema } from '@/lib/seed/seed-files';

const service = {
  credibility: 'shipped it',
  deliverables: ['a thing'],
  name: 'Audit',
  pitch: 'a pitch',
  slug: 'audit',
};

describe('the committed Seed', () => {
  /**
   * CI and the E2E harness seed an empty database before every build
   * (docs/adr/0001), so a Seed file that does not parse is a build nobody
   * can make. This reads the real `seed/` directory.
   */
  it('parses', () => {
    expect(() => loadSeed('seed')).not.toThrow();
  });

  it('carries the Site settings', () => {
    expect(loadSeed('seed').siteSettings.name).toBe('Michaux Kelley');
  });

  /** A Seed that names a file it does not carry would fail every build at the upload. */
  it('carries the Resume it names', () => {
    const { directory, siteSettings } = loadSeed('seed');

    expect(existsSync(join(directory, siteSettings.resume ?? 'missing'))).toBe(true);
  });

  /** A build against a database filled from the Seed needs every Fixed Page. */
  it('carries a Page for every address the site is built around, and the rest', () => {
    expect(loadSeed('seed').pages.map(({ slug }) => slug)).toEqual([
      'blog',
      'contact',
      'services',
      'uses',
      'cv',
      'home',
    ]);
  });

  /** A Seed that names a picture it does not carry would fail every build at the upload. */
  it('carries every picture its Pages name', () => {
    const { directory, pages } = loadSeed('seed');
    const pictures = pages
      .flatMap(({ blocks }) => blocks)
      .flatMap((block) => {
        if (block.blockType === 'terminal') {
          return block.picture === null ? [] : [block.picture.file];
        }
        return block.blockType === 'picture' ? [block.media.file] : [];
      });

    expect(pictures.filter((file) => !existsSync(join(directory, file)))).toEqual([]);
  });

  it('carries the header menu the site has today', () => {
    expect(loadSeed('seed').siteSettings.headerMenu.map(({ label }) => label)).toEqual([
      './home',
      './blog',
      './services',
      './cv',
      './contact',
    ]);
  });

  it('carries the services, in the order the site shows them', () => {
    expect(loadSeed('seed').services.map(({ slug }) => slug)).toEqual([
      'ai-enablement',
      'product-dev',
      'accessibility',
      'performance',
      'mentoring',
    ]);
  });
});

const siteSettings = {
  description: 'a description',
  footerMenu: [{ label: 'elsewhere', page: null, url: 'https://example.com/elsewhere' }],
  headerMenu: [{ label: './home', page: 'home', url: null }],
  name: 'Owner Name',
  repoUrl: 'https://example.com/repo',
  resume: 'files/resume.pdf',
  socials: {
    bluesky: null,
    github: 'https://example.com/github',
    linkedin: 'https://example.com/linkedin',
  },
  tagline: 'a tagline',
  title: 'a browser title',
};

describe('siteSettingsSeedSchema', () => {
  it('accepts the settings', () => {
    expect(siteSettingsSeedSchema.parse(siteSettings)).toEqual(siteSettings);
  });

  /** A null link is how the Seed says "hidden", so it must survive. */
  it('accepts a missing repository link as null', () => {
    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, repoUrl: null }).success).toBe(true);
  });

  it('rejects a link that is not https', () => {
    expect(
      siteSettingsSeedSchema.safeParse({ ...siteSettings, repoUrl: 'http://example.com' }).success
    ).toBe(false);
  });

  /** No Resume is a state the owner can choose: the download button is hidden. */
  it('accepts a Seed with no Resume', () => {
    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, resume: null }).success).toBe(true);
  });

  /** The Seed uploads this file, so it may only name one inside `seed/files`. */
  it.each(['../secrets.pdf', '/etc/passwd', 'files/../../x.pdf', 'files/resume.txt', 'resume.pdf'])(
    'rejects a Resume path of %s',
    (resume) => {
      expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, resume }).success).toBe(false);
    }
  );

  it('rejects a menu item that points at a Page and an address', () => {
    const headerMenu = [{ label: 'both', page: 'home', url: 'https://example.com' }];

    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, headerMenu }).success).toBe(false);
  });

  it('rejects a menu item that points nowhere', () => {
    const headerMenu = [{ label: 'nowhere', page: null, url: null }];

    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, headerMenu }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, name: '' }).success).toBe(false);
  });

  it('rejects a key it does not know', () => {
    expect(siteSettingsSeedSchema.safeParse({ ...siteSettings, handle: 'x' }).success).toBe(false);
  });
});

describe('servicesSeedSchema', () => {
  it('accepts a list of services', () => {
    expect(servicesSeedSchema.parse([service])).toEqual([service]);
  });

  /** The slug is what the Seed matches an existing record by. */
  it('rejects two services with the same slug', () => {
    expect(servicesSeedSchema.safeParse([service, service]).success).toBe(false);
  });

  it('rejects a slug that could not be a URL fragment', () => {
    expect(servicesSeedSchema.safeParse([{ ...service, slug: 'Audit Me' }]).success).toBe(false);
  });

  it('rejects a service with no deliverables', () => {
    expect(servicesSeedSchema.safeParse([{ ...service, deliverables: [] }]).success).toBe(false);
  });

  /**
   * Capture rewrites these files from the live site. A key the schema does
   * not know means the two have drifted, and silently dropping it would lose
   * owner content.
   */
  it('rejects a key it does not know', () => {
    expect(servicesSeedSchema.safeParse([{ ...service, order: 3 }]).success).toBe(false);
  });
});

describe('loadSeed', () => {
  const write = (directory: string, siteSettingsFile: object): void => {
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'pages.json'), JSON.stringify(loadSeed('seed').pages));
    writeFileSync(join(directory, 'services.json'), JSON.stringify([service]));
    writeFileSync(join(directory, 'site-settings.json'), JSON.stringify(siteSettingsFile));
  };

  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'seed-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('reads a Seed whose menus link to Pages it carries', () => {
    write(directory, siteSettings);

    expect(loadSeed(directory).siteSettings.headerMenu).toHaveLength(1);
  });

  /** The fill would have no Page to point the item at. */
  it('refuses a menu that links to a Page the Seed does not carry', () => {
    const headerMenu = [{ label: './now', page: 'now', url: null }];
    write(directory, { ...siteSettings, headerMenu });

    expect(() => loadSeed(directory)).toThrow('a menu links to the now Page');
  });
});
