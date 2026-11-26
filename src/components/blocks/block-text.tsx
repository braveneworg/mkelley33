/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { ComponentProps } from 'react';

import { RichText } from '@payloadcms/richtext-lexical/react';

import { SiteAnchor } from '@/components/blocks/site-link';
import { type LinkedPage, resolveLink } from '@/lib/pages/links';

import type { DefaultNodeTypes, SerializedLinkNode } from '@payloadcms/richtext-lexical';
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';

type LinkTarget = SerializedLinkNode['fields'];

/** An address on another site, which opens in a new tab. */
const OUTSIDE = /^https?:\/\//i;

/**
 * The Page a link points at, as `resolveLink` judges one, or null when
 * there is none to follow: the editor lets a link point at any kind of
 * record, and only a Page has an address of its own here.
 */
const linkedPage = (doc: LinkTarget['doc']): LinkedPage | null => {
  const value = doc?.relationTo === 'pages' ? doc.value : null;
  // An id rather than a document means the Page is gone.
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { _status, slug } = value;
  return typeof slug === 'string'
    ? { _status: _status === 'published' ? 'published' : 'draft', slug }
    : null;
};

/**
 * Where a link in the text leads, or null when it leads nowhere: no address
 * typed, or a Page that is unpublished or deleted. A link to a Page goes
 * through `resolveLink`, so it is hidden exactly when a menu item pointing
 * at the same Page would be.
 */
const linkTarget = ({
  doc,
  linkType,
  url,
}: LinkTarget): null | { external: boolean; href: string } => {
  if (linkType === 'internal') {
    // `resolveLink` needs a label to resolve anything; the text has its own words.
    return resolveLink({ label: 'link', page: linkedPage(doc) });
  }
  return url ? { external: OUTSIDE.test(url), href: url } : null;
};

const TextLink = ({
  arrow,
  children,
  target,
}: {
  arrow: boolean;
  children: React.ReactNode;
  target: LinkTarget;
}) => {
  const resolved = linkTarget(target);
  // The words stay; only the link is withheld.
  return resolved === null ? (
    <>{children}</>
  ) : (
    <SiteAnchor arrow={arrow} external={resolved.external} href={resolved.href}>
      {children}
    </SiteAnchor>
  );
};

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/**
 * The element a heading in the text is shown as. The Page's own heading is
 * its one main heading (see `PageHeading`), so a top-level heading typed
 * into the text is shown one level down.
 */
const SHOWN_AS = new Map<string, HeadingTag>([
  ['h1', 'h2'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['h5', 'h5'],
  ['h6', 'h6'],
]);

const HEADING_CLASSES = new Map<HeadingTag, string>([
  ['h2', 'text-phosphor mt-10 font-mono text-lg font-bold first:mt-0'],
  ['h3', 'mt-6 font-mono text-base font-bold first:mt-0'],
]);
const SMALL_HEADING_CLASSES = 'mt-6 font-mono text-sm font-bold first:mt-0';

const TextHeading = ({ children, tag }: { children: React.ReactNode; tag: string }) => {
  const Tag = SHOWN_AS.get(tag) ?? 'h2';
  return (
    <Tag className={HEADING_CLASSES.get(Tag) ?? SMALL_HEADING_CLASSES}>
      {/* `h3` is shown as `### `, the way the heading would be typed. */}
      <span aria-hidden="true">{`${'#'.repeat(Number(Tag.slice(1)))} `}</span>
      {children}
    </Tag>
  );
};

/** How each kind of node is shown; `arrows` puts one after a link that leaves the site. */
const convertersWith =
  (arrows: boolean): JSXConvertersFunction<DefaultNodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    autolink: ({ node, nodesToJSX }) => (
      <TextLink arrow={arrows} target={node.fields}>
        {nodesToJSX({ nodes: node.children })}
      </TextLink>
    ),
    heading: ({ node, nodesToJSX }) => (
      <TextHeading tag={node.tag}>{nodesToJSX({ nodes: node.children })}</TextHeading>
    ),
    link: ({ node, nodesToJSX }) => (
      <TextLink arrow={arrows} target={node.fields}>
        {nodesToJSX({ nodes: node.children })}
      </TextLink>
    ),
  });

const PLAIN = convertersWith(false);
const WITH_ARROWS = convertersWith(true);

/** A link looks the same wherever the text is shown. */
const LINKS = '[&_a]:text-phosphor [&_a]:underline [&_a]:underline-offset-4';

/** The text as a column of prose, which is what most Blocks show. */
const PROSE =
  'text-fg max-w-2xl space-y-4 leading-relaxed [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6';

/**
 * The text the owner writes into a Block, in the site's own dress: headings
 * with their `#` marks, lists, and links that behave like every other link
 * on the site.
 *
 * It is a column of prose unless `className` says otherwise — a line of the
 * CV sits inside a list or a heading's row and brings its own size and
 * colour. `arrows` marks each link that leaves the site.
 */
export const BlockText = ({
  arrows = false,
  className = PROSE,
  data,
}: {
  arrows?: boolean;
  className?: string;
  data: ComponentProps<typeof RichText>['data'];
}) => (
  <RichText
    className={`${LINKS} ${className}`}
    converters={arrows ? WITH_ARROWS : PLAIN}
    data={data}
  />
);
