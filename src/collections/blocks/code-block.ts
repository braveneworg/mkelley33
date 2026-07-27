/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Block } from 'payload';

export const CODE_LANGUAGES = [
  'ts',
  'tsx',
  'js',
  'jsx',
  'bash',
  'json',
  'css',
  'html',
  'md',
  'text',
] as const;

export const CodeBlock: Block = {
  slug: 'code',
  fields: [
    {
      name: 'language',
      type: 'select',
      defaultValue: 'ts',
      options: CODE_LANGUAGES.map((value) => ({ label: value, value })),
      required: true,
    },
    { name: 'code', type: 'code', required: true },
  ],
  interfaceName: 'CodeBlockFields',
  jsx: {
    export: ({ fields }) => ({
      children: fields.code,
      props: { language: fields.language },
    }),
    import: ({ children, props }) => ({
      code: children,
      language: typeof props?.language === 'string' ? props.language : 'text',
    }),
  },
};
