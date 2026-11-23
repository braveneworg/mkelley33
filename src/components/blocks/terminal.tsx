/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Image from 'next/image';

import { RichText } from '@payloadcms/richtext-lexical/react';

import { BlockSection } from '@/components/blocks/block-section';
import type { Media, TerminalBlock } from '@/payload-types';

const PORTRAIT_SIZE = 120;
/** What an upload without recorded dimensions is laid out as. */
const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 480;

const Picture = ({
  media: { alt, height, url, width },
  round,
}: {
  media: Media;
  round: boolean;
}) =>
  url ? (
    <div className="shrink-0">
      {round ? (
        <Image
          alt={alt}
          className="border-edge size-30 rounded-full border object-cover"
          height={PORTRAIT_SIZE}
          src={url}
          width={PORTRAIT_SIZE}
        />
      ) : (
        <Image
          alt={alt}
          className="border-edge h-auto max-w-xs rounded border"
          height={height ?? FALLBACK_HEIGHT}
          src={url}
          width={width ?? FALLBACK_WIDTH}
        />
      )}
    </div>
  ) : null;

/** Free text the owner writes, with an optional picture beside it. */
export const Terminal = ({
  block: { body, command, picture, pictureStyle },
}: {
  block: TerminalBlock;
}) => (
  <BlockSection command={command}>
    <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
      {/* An id rather than a document means the upload could not be resolved. */}
      {typeof picture === 'object' && picture !== null ? (
        <Picture media={picture} round={pictureStyle === 'roundPortrait'} />
      ) : null}
      <RichText
        className="text-fg [&_a]:text-phosphor max-w-2xl space-y-4 leading-relaxed [&_a]:underline [&_a]:underline-offset-4"
        data={body}
      />
    </div>
  </BlockSection>
);
