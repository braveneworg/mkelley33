/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { validateHttpsUrl } from '@/globals/validate-https-url';

import type { GroupField, TextField, TextFieldSingleValidation } from 'payload';

/**
 * The `$ command` line shown above a Block. Every Block that has one lets
 * the owner edit it; left empty, the Block is shown without the line.
 */
export const commandField = (defaultValue?: string): TextField => ({
  name: 'command',
  type: 'text',
  admin: { description: 'Shown above this Block as "$ …". Leave empty for no command line.' },
  defaultValue,
  label: 'Command line',
});

/**
 * An outside address is a full https:// one, and a link is a Page or an
 * address, never both: with both set, which one the site follows would be a
 * guess.
 */
export const validateLinkUrl: TextFieldSingleValidation = (value, { siblingData }) => {
  const { page } = siblingData as { page?: unknown };
  if (value && page) {
    return 'Choose a Page or type an address, not both.';
  }
  return validateHttpsUrl(value);
};

/**
 * A link the owner points somewhere: at a Page, so that it follows the Page
 * when its address changes, or at a full address elsewhere. Menus and Blocks
 * share this shape, and `resolveLink` in `src/lib/pages/links.ts` turns it
 * into an `href`.
 */
export const linkGroup = (name: string, label: string): GroupField => ({
  name,
  type: 'group',
  fields: [
    { name: 'label', type: 'text' },
    {
      name: 'page',
      type: 'relationship',
      admin: { description: 'A Page on this site. The link follows it if its address changes.' },
      relationTo: 'pages',
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'Or a full https:// address elsewhere. Leave empty when a Page is set.',
      },
      label: 'Outside address',
      validate: validateLinkUrl,
    },
  ],
  label,
});
