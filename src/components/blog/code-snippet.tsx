/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CopyButton } from '@/components/blog/copy-button';
import { highlightCode } from '@/lib/highlight';

export const CodeSnippet = async ({ code, language }: { code: string; language: string }) => {
  const html = await highlightCode(code, language);
  return (
    <figure className="border-edge bg-surface my-6 overflow-hidden rounded-lg border">
      <figcaption className="border-edge flex items-center justify-between border-b px-4 py-2">
        <span className="text-fg-muted font-mono text-xs">{language}</span>
        <CopyButton code={code} />
      </figcaption>
      {/* Shiki output is trusted server-generated markup */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
};
