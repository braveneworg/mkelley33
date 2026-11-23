/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { keepPrivacyPageWhole } from '@/collections/hooks/keep-privacy-page-whole';

import type { CollectionBeforeChangeHook } from 'payload';

type HookArgs = Parameters<CollectionBeforeChangeHook>[0];

const BOTH = [{ blockType: 'cookieInventory' }, { blockType: 'managePreferences' }];

/** The hook reads the save and the stored Page, nothing else. */
const save = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
  keepPrivacyPageWhole({ data, originalDoc } as HookArgs);

const thrownBy = (attempt: () => unknown): unknown => {
  try {
    attempt();
  } catch (error) {
    return error;
  }
  return undefined;
};

/** Payload shows the admin each error's own message; the thrown one is generic. */
const refusalNaming = (block: string) => ({
  data: { errors: [{ message: expect.stringContaining(block) as unknown }] },
});

describe('keepPrivacyPageWhole', () => {
  it('lets the privacy Page be published with both guarded Blocks', () => {
    const data = { _status: 'published', blocks: BOTH, slug: 'privacy' };

    expect(save(data)).toBe(data);
  });

  it('refuses to publish the privacy Page without the cookie inventory', () => {
    const data = { _status: 'published', blocks: [BOTH[1]], slug: 'privacy' };

    expect(thrownBy(() => save(data))).toMatchObject(refusalNaming('Cookie inventory'));
  });

  it('refuses to publish the privacy Page without the manage-preferences button', () => {
    const data = { _status: 'published', blocks: [BOTH[0]], slug: 'privacy' };

    expect(thrownBy(() => save(data))).toMatchObject(refusalNaming('Manage preferences'));
  });

  it('refuses to publish the privacy Page with no Blocks at all', () => {
    expect(() => save({ _status: 'published', slug: 'privacy' })).toThrow();
  });

  /** A draft is where the owner rearranges things; visitors never see it. */
  it('lets a draft of the privacy Page be saved without them', () => {
    const data = { _status: 'draft', blocks: [], slug: 'privacy' };

    expect(save(data)).toBe(data);
  });

  it('leaves every other Page alone', () => {
    const data = { _status: 'published', blocks: [], slug: 'uses' };

    expect(save(data)).toBe(data);
  });

  /** A save that sends only what changed still publishes the whole Page. */
  it('judges a partial save against the Blocks already stored', () => {
    const stored = { _status: 'published', blocks: BOTH, slug: 'privacy' };
    const data = { title: 'privacy policy' };

    expect(save(data, stored)).toBe(data);
  });

  it('refuses a partial save that takes a guarded Block off the published Page', () => {
    const stored = { _status: 'published', blocks: BOTH, slug: 'privacy' };

    expect(thrownBy(() => save({ blocks: [BOTH[0]] }, stored))).toMatchObject(
      refusalNaming('Manage preferences')
    );
  });

  it('refuses to publish a stored draft that lacks them', () => {
    const stored = { _status: 'draft', blocks: [], slug: 'privacy' };

    expect(() => save({ _status: 'published' }, stored)).toThrow();
  });

  it('says where in the admin the problem is', () => {
    expect(
      thrownBy(() => save({ _status: 'published', blocks: [], slug: 'privacy' }))
    ).toMatchObject({ data: { errors: [{ path: 'blocks' }] } });
  });
});
