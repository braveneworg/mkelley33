/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Image from 'next/image';

import { BlockSection } from '@/components/blocks/block-section';
import type { PictureBlock } from '@/payload-types';

/** What an upload without recorded dimensions is laid out as. */
const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 720;

export const Picture = ({ block: { caption, media } }: { block: PictureBlock }) => {
  // An id rather than a document means the upload could not be resolved.
  if (typeof media !== 'object' || !media.url) {
    return null;
  }
  return (
    <BlockSection>
      <figure className="max-w-3xl">
        <Image
          alt={media.alt}
          className="border-edge h-auto w-full rounded border"
          height={media.height ?? FALLBACK_HEIGHT}
          src={media.url}
          width={media.width ?? FALLBACK_WIDTH}
        />
        {caption ? (
          <figcaption className="text-fg-muted mt-2 font-mono text-xs">{caption}</figcaption>
        ) : null}
      </figure>
    </BlockSection>
  );
};
