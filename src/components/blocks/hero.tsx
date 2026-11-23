/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { Magnetic } from '@/components/motion/magnetic';
import { ButtonLink } from '@/components/ui/button-link';
import { resolveLink } from '@/lib/pages/links';
import { getSiteSettings } from '@/lib/repositories/site-settings';
import type { HeroBlock } from '@/payload-types';

const SECOND_BUTTON =
  'border-edge text-fg-muted hover:text-fg rounded border px-4 py-2 transition-colors';

/**
 * The owner's name and tagline come from Site settings, so they read the
 * same here as in the browser title. As the first Block of a Page the name
 * is the Page's main heading; anywhere else it is an ordinary heading, so a
 * Page never has two.
 */
export const Hero = async ({
  block: { command, primaryAction, secondaryAction, summary },
  isPageHeading,
}: {
  block: HeroBlock;
  isPageHeading: boolean;
}) => {
  const { name, tagline } = await getSiteSettings();
  const primary = resolveLink(primaryAction);
  const secondary = resolveLink(secondaryAction);
  const Heading = isPageHeading ? 'h1' : 'h2';
  return (
    <section className="scanlines bg-blueprint">
      <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-28">
        {command ? (
          <p aria-hidden="true" className="typewriter text-phosphor font-mono text-sm">
            $ {command}
          </p>
        ) : null}
        <Heading className="mt-4 font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          {name}
        </Heading>
        <p className="text-phosphor mt-3 font-mono text-lg">{tagline}</p>
        {summary ? (
          <p className="text-fg-muted mt-5 max-w-xl leading-relaxed">
            <span aria-hidden="true"># </span>
            {summary}
          </p>
        ) : null}
        {primary || secondary ? (
          <div className="mt-8 flex flex-wrap gap-4 font-mono text-sm">
            {primary ? (
              <Magnetic>
                <ButtonLink href={primary.href}>{primary.label}</ButtonLink>
              </Magnetic>
            ) : null}
            {secondary ? (
              <Link className={SECOND_BUTTON} href={secondary.href}>
                {secondary.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};
