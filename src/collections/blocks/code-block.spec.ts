/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CODE_LANGUAGES, CodeBlock } from '@/collections/blocks/code-block';

const jsx = CodeBlock.jsx;

describe('CodeBlock field config', () => {
  it('offers every supported language as a select option', () => {
    const language = CodeBlock.fields.find((f) => 'name' in f && f.name === 'language');
    const options = language && 'options' in language ? language.options : undefined;

    expect(options).toEqual(CODE_LANGUAGES.map((value) => ({ label: value, value })));
  });
});

describe('CodeBlock jsx.export', () => {
  it('maps code to children and language to a prop', () => {
    const result = jsx?.export?.({ fields: { code: 'const a = 1;', language: 'ts' } } as never);

    expect(result).toEqual({ children: 'const a = 1;', props: { language: 'ts' } });
  });
});

describe('CodeBlock jsx.import', () => {
  it('reads the language from props when it is a string', () => {
    const result = jsx?.import?.({ children: 'echo hi', props: { language: 'bash' } } as never);

    expect(result).toEqual({ code: 'echo hi', language: 'bash' });
  });

  it('falls back to text when the language prop is missing or not a string', () => {
    expect(jsx?.import?.({ children: 'x', props: {} } as never)).toEqual({
      code: 'x',
      language: 'text',
    });
    expect(jsx?.import?.({ children: 'x', props: { language: 42 } } as never)).toEqual({
      code: 'x',
      language: 'text',
    });
    expect(jsx?.import?.({ children: 'x' } as never)).toEqual({ code: 'x', language: 'text' });
  });
});
