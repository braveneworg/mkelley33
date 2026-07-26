import { CopyButton } from '@/components/blog/copy-button';
import { highlightCode } from '@/lib/highlight';

export async function CodeSnippet({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const html = await highlightCode(code, language);
  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-edge bg-surface">
      <figcaption className="flex items-center justify-between border-b border-edge px-4 py-2">
        <span className="font-mono text-xs text-fg-muted">{language}</span>
        <CopyButton code={code} />
      </figcaption>
      {/* Shiki output is trusted server-generated markup */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
