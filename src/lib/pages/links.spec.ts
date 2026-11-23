/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { resolveLink } from '@/lib/pages/links';
import type { Page } from '@/payload-types';

const page = (slug: string, status: 'draft' | 'published'): Page =>
  ({ _status: status, id: `id-${slug}`, slug, title: slug }) as Page;

describe('resolveLink', () => {
  it('points at a published Page by its address', () => {
    expect(resolveLink({ label: 'uses', page: page('uses', 'published') })).toEqual({
      external: false,
      href: '/uses',
      label: 'uses',
    });
  });

  it('points at the home Page as the root', () => {
    expect(resolveLink({ label: 'home', page: page('home', 'published') })?.href).toBe('/');
  });

  /** The owner's decision of 2026-11-23: such a link is hidden, not broken. */
  it('is nothing while its Page is unpublished', () => {
    expect(resolveLink({ label: 'uses', page: page('uses', 'draft') })).toBeNull();
  });

  /** A Fixed Page stays on the site when unpublished, so links to it stay too. */
  it('still points at a Fixed Page that was unpublished', () => {
    expect(resolveLink({ label: 'blog', page: page('blog', 'draft') })?.href).toBe('/blog');
  });

  /** A deleted Page leaves only its id behind. */
  it('is nothing when its Page could not be resolved', () => {
    expect(resolveLink({ label: 'gone', page: 'id-of-a-deleted-page' })).toBeNull();
  });

  it('points at an outside address', () => {
    expect(resolveLink({ label: 'docs', url: 'https://example.com/docs' })).toEqual({
      external: true,
      href: 'https://example.com/docs',
      label: 'docs',
    });
  });

  it('is nothing without a label', () => {
    expect(resolveLink({ label: '', url: 'https://example.com' })).toBeNull();
  });

  it('is nothing when it points nowhere', () => {
    expect(resolveLink({ label: 'nowhere' })).toBeNull();
  });

  it('is nothing when the group was never filled in', () => {
    expect(resolveLink(undefined)).toBeNull();
  });
});
