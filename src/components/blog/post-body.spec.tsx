/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { act, Suspense } from 'react';

import { render, screen } from '@testing-library/react';

import { PostBody } from '@/components/blog/post-body';
import type { Post } from '@/payload-types';
import { makePost } from '@/test/make-post';

vi.mock('@/lib/highlight', () => ({
  highlightCode: vi.fn().mockResolvedValue('<pre class="shiki"><code>const x = 1;</code></pre>'),
}));

describe('PostBody', () => {
  it('renders paragraph text from a serialized lexical body', () => {
    render(<PostBody body={makePost().body} />);
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  it('renders a code block through the CodeSnippet converter', async () => {
    const body = {
      root: {
        children: [
          {
            children: [{ text: 'body text', type: 'text', version: 1 }],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
          {
            fields: {
              blockName: '',
              blockType: 'code',
              code: 'const x = 1;',
              id: 'a1b2c3d4e5f60718293a4b5c',
              language: 'ts',
            },
            format: '',
            type: 'block',
            version: 2,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as Post['body'];

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <PostBody body={makePost({ body }).body} />
        </Suspense>
      );
    });

    expect(await screen.findByText('const x = 1;')).toBeInTheDocument();
    expect(await screen.findByText('ts')).toBeInTheDocument();
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  it('falls back to an empty string and "text" language when a code block omits its fields', async () => {
    const body = {
      root: {
        children: [
          {
            fields: {
              blockName: '',
              blockType: 'code',
              id: 'a1b2c3d4e5f60718293a4b5c',
            },
            format: '',
            type: 'block',
            version: 2,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    } as unknown as Post['body'];

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <PostBody body={makePost({ body }).body} />
        </Suspense>
      );
    });

    expect(await screen.findByText('text')).toBeInTheDocument();
  });
});
