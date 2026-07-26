import type {
  DefaultNodeTypes,
  SerializedBlockNode,
} from '@payloadcms/richtext-lexical';
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';

import { RichText } from '@payloadcms/richtext-lexical/react';

import type { CodeBlockFields, Post } from '@/payload-types';

import { CodeSnippet } from '@/components/blog/code-snippet';

type PostNodeTypes = DefaultNodeTypes | SerializedBlockNode<CodeBlockFields>;

const converters: JSXConvertersFunction<PostNodeTypes> = ({
  defaultConverters,
}) => ({
  ...defaultConverters,
  blocks: {
    code: ({ node }) => (
      <CodeSnippet
        code={String(node.fields.code ?? '')}
        language={String(node.fields.language ?? 'text')}
      />
    ),
  },
});

export function PostBody({ body }: { body: Post['body'] }) {
  return (
    <div className="prose-terminal mt-8 max-w-2xl leading-relaxed [&_a]:text-phosphor [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-phosphor [&_h3]:mt-8 [&_h3]:font-mono [&_h3]:font-bold [&_li]:my-1 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_code]:font-mono [&_code]:text-sm"
      >
      <RichText converters={converters} data={body} />
    </div>
  );
}
