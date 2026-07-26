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
