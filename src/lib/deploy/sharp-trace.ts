/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Pure decisions for the sharp guard in `scripts/ci-build.ts`, which keeps
 * the side effects (walking `.next/`, reading the trace files).
 *
 * sharp is a native addon that loads libvips from a separate package
 * (`@img/sharp-libvips-<platform>`). Next's output file tracing decides which
 * files reach a Vercel function bundle, and it follows JS requires — the
 * addon's link-time dependency on the shared library is invisible to it
 * unless the bundler special-cases sharp. When it did not (sharp 0.35 on
 * next 16.2), the addon shipped without its libvips, every lambda threw
 * ERR_DLOPEN_FAILED at cold start, and production's dynamic layer 500'd from
 * 2026-08-02 to 2026-09-03 behind stale prerendered pages. The build was
 * green throughout, so the trace is the only place to catch it before a
 * deploy.
 */

/** What one output-file trace says about sharp. */
export type SharpTraceVerdict = 'absent' | 'complete' | 'missing-libvips';

/** One `*.nft.json` trace: where it lives and the files it lists. */
export interface OutputFileTrace {
  files: readonly string[];
  path: string;
}

export interface SharpTraceSummary {
  /** Traces that carry the addon together with its libvips. */
  complete: number;
  /** Paths of traces that carry the addon without its libvips. */
  missingLibvips: string[];
}

/** The native addon itself, e.g. `@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node`. */
const SHARP_ADDON = /@img\/sharp-[a-z0-9-]+\/lib\/sharp-[a-z0-9.-]+\.node$/;

/**
 * The shared library the addon loads — `libvips-cpp.so.8.18.7` on Linux,
 * `libvips-cpp.8.18.7.dylib` on macOS. Anchored on the file, because a trace
 * can list the libvips package directory (a pnpm symlink) without any of its
 * contents.
 */
const LIBVIPS_LIBRARY = /@img\/sharp-libvips-[a-z0-9-]+\/lib\/libvips-cpp\.[a-z0-9.]+$/;

const anyMatch = (files: readonly string[], pattern: RegExp): boolean =>
  files.some((file) => pattern.test(file));

/** Classifies a single trace by whether sharp's addon arrived with its libvips. */
export const sharpTraceVerdict = (files: readonly string[]): SharpTraceVerdict => {
  if (!anyMatch(files, SHARP_ADDON)) {
    return 'absent';
  }
  return anyMatch(files, LIBVIPS_LIBRARY) ? 'complete' : 'missing-libvips';
};

/** Rolls every trace of a build up into what the guard needs to decide. */
export const summarizeSharpTraces = (traces: readonly OutputFileTrace[]): SharpTraceSummary => {
  const verdicts = traces.map(({ files, path }) => ({ path, verdict: sharpTraceVerdict(files) }));

  return {
    complete: verdicts.filter(({ verdict }) => verdict === 'complete').length,
    missingLibvips: verdicts
      .filter(({ verdict }) => verdict === 'missing-libvips')
      .map(({ path }) => path),
  };
};
