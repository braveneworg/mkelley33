/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { existsSync } from 'node:fs';
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
