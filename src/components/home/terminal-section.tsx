/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Reveal } from '@/components/motion/reveal';

export const TerminalSection = ({
  children,
  command,
}: {
  children: React.ReactNode;
  command: string;
}) => (
  <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
    <h2 className="text-fg-muted font-mono text-sm">
      <span aria-hidden="true" className="text-phosphor">
        $
      </span>{' '}
      {command}
    </h2>
    <Reveal>
      <div className="mt-6">{children}</div>
    </Reveal>
  </section>
);
