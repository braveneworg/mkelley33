/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { sharpTraceVerdict, summarizeSharpTraces } from '@/lib/deploy/sharp-trace';

const STORE = '../node_modules/.pnpm';

const LINUX_ADDON = `${STORE}/@img+sharp-linux-x64@0.35.5/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node`;
const LINUX_LIBVIPS = `${STORE}/@img+sharp-libvips-linux-x64@1.3.4/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.7`;
const DARWIN_ADDON = `${STORE}/@img+sharp-darwin-arm64@0.35.5/node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.5.node`;
const DARWIN_LIBVIPS = `${STORE}/@img+sharp-libvips-darwin-arm64@1.3.4/node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.18.7.dylib`;
const UNRELATED = `${STORE}/payload@3.93.0/node_modules/payload/dist/index.js`;

describe('sharpTraceVerdict', () => {
  it('reports a trace that never loads sharp as absent', () => {
    expect(sharpTraceVerdict([UNRELATED])).toBe('absent');
  });

  it('accepts a linux trace that carries the addon and its libvips', () => {
    expect(sharpTraceVerdict([UNRELATED, LINUX_ADDON, LINUX_LIBVIPS])).toBe('complete');
  });

  it('accepts a darwin trace that carries the addon and its libvips', () => {
    expect(sharpTraceVerdict([DARWIN_ADDON, DARWIN_LIBVIPS])).toBe('complete');
  });

  it('flags the outage shape: the addon traced without its libvips', () => {
    expect(sharpTraceVerdict([UNRELATED, LINUX_ADDON])).toBe('missing-libvips');
  });

  it('does not mistake the libvips package directory for the library file', () => {
    const packageDirectoryOnly = `${STORE}/@img+sharp-linux-x64@0.35.5/node_modules/@img/sharp-libvips-linux-x64`;

    expect(sharpTraceVerdict([LINUX_ADDON, packageDirectoryOnly])).toBe('missing-libvips');
  });
});

describe('summarizeSharpTraces', () => {
  it('names every trace that is missing libvips', () => {
    const summary = summarizeSharpTraces([
      { files: [LINUX_ADDON, LINUX_LIBVIPS], path: 'server/app/a.js.nft.json' },
      { files: [LINUX_ADDON], path: 'server/app/b.js.nft.json' },
      { files: [UNRELATED], path: 'server/app/c.js.nft.json' },
    ]);

    expect(summary.missingLibvips).toEqual(['server/app/b.js.nft.json']);
  });

  it('counts the traces that carry sharp completely', () => {
    const summary = summarizeSharpTraces([
      { files: [LINUX_ADDON, LINUX_LIBVIPS], path: 'server/app/a.js.nft.json' },
      { files: [DARWIN_ADDON, DARWIN_LIBVIPS], path: 'server/app/b.js.nft.json' },
      { files: [UNRELATED], path: 'server/app/c.js.nft.json' },
    ]);

    expect(summary.complete).toBe(2);
  });
});
