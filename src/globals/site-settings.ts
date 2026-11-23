/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { menuField } from '@/collections/page-blocks/fields';
import { revalidateSiteSettings } from '@/globals/hooks/revalidate-site-settings';
import { validateHttpsUrl, validateRequiredHttpsUrl } from '@/globals/validate-https-url';

import type { GlobalConfig } from 'payload';

/**
 * Site settings — the single set of values every Page shares (see
 * `CONTEXT.md`): the owner's identity, links, menus, and Resume. The site's domain is not
 * here; it stays in `src/lib/site-config.ts`, because changing it is a
 * deploy, not an edit.
 *
 * Drafts are on from the start. The owner saves a draft, publishes it, and
 * every published version is kept. Visitors only ever get published
 * settings — and always get some: unpublishing leaves the last published
 * version in force (see `published-site-settings.ts`).
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    // A signed-in owner sees drafts; everyone else only what is published.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'tagline', type: 'text', required: true },
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Shown in the browser tab and in search results.' },
      label: 'Browser title',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'The summary search engines and link previews show.' },
      required: true,
    },
    {
      name: 'socials',
      type: 'group',
      fields: [
        { name: 'github', type: 'text', required: true, validate: validateRequiredHttpsUrl },
        { name: 'linkedin', type: 'text', required: true, validate: validateRequiredHttpsUrl },
        {
          name: 'bluesky',
          type: 'text',
          admin: { description: 'Leave empty to hide it everywhere.' },
          validate: validateHttpsUrl,
        },
      ],
      label: 'Social links',
    },
    {
      name: 'repoUrl',
      type: 'text',
      admin: { description: "This site's public repository. Leave empty to hide the links to it." },
      label: 'Repository link',
      validate: validateHttpsUrl,
    },
    {
      name: 'resume',
      type: 'upload',
      admin: {
        description:
          'The PDF served at /michaux-kelley-resume.pdf. Leave empty to hide the download button.',
      },
      relationTo: 'resume-files',
    },
    menuField(
      'headerMenu',
      'Header menu',
      'The links at the top of every page. An item whose Page is unpublished is hidden until the Page is published again.'
    ),
    menuField(
      'footerMenu',
      'Footer menu',
      'Extra links at the bottom of every page. The footer adds your social links, the RSS feed and the privacy link by itself.'
    ),
  ],
  hooks: { afterChange: [revalidateSiteSettings] },
  admin: {
    description:
      'Shared by every page. Unpublishing does not take these off the site: visitors keep the last published version until you publish again.',
  },
  label: 'Site settings',
  versions: { drafts: true },
};
