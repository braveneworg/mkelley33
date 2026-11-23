/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Reveal } from '@/components/motion/reveal';

/**
 * The frame every Block is shown in: the site's column, and the Block's
 * `$ command` line when the owner gave it one. A Block with a command line
 * is a section of its own and gets room around it; one without sits close
 * under whatever came before, as a continuation of the Page.
 */
export const BlockSection = ({
  children,
  command,
}: {
  children: React.ReactNode;
  command?: null | string;
}) => (
  <section
    className={`mx-auto w-full max-w-5xl px-5 ${command ? 'py-12 sm:py-16' : 'py-5 sm:py-6'}`}
  >
    {command ? (
      <h2 className="text-fg-muted font-mono text-sm print:hidden">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        {command}
      </h2>
    ) : null}
    <Reveal>
      <div className={command ? 'mt-6' : undefined}>{children}</div>
    </Reveal>
  </section>
);
