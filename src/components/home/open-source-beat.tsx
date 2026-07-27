/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { TerminalSection } from '@/components/home/terminal-section';
import { siteConfig } from '@/lib/site-config';

export const OpenSourceBeat = () => (
  <TerminalSection command="ls ./open-source">
    <ul className="max-w-2xl space-y-5">
      <li>
        {siteConfig.repoUrl ? (
          <a
            className="text-phosphor font-mono text-sm underline underline-offset-4"
            href={siteConfig.repoUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            this-site/
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : (
          <span className="text-phosphor font-mono text-sm">this-site/</span>
        )}
        <p className="text-fg-muted mt-1 text-sm leading-relaxed">
          You&apos;re looking at it. This entire site — design system, CMS, tests, CI — is open
          source on GitHub.
        </p>
      </li>
      <li>
        <a
          className="text-phosphor font-mono text-sm underline underline-offset-4"
          href="https://github.com/braveneworg/boudreaux"
          rel="noopener noreferrer"
          target="_blank"
        >
          boudreaux/
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        <p className="text-fg-muted mt-1 text-sm leading-relaxed">
          MPL 2.0 music marketplace for Fake Four Records — founding engineer. Streaming, downloads,
          and Stripe Connect payouts (fakefourrecords.com).
        </p>
      </li>
      <li>
        <span className="text-phosphor font-mono text-sm">contributions/</span>
        <p className="text-fg-muted mt-1 text-sm leading-relaxed">
          react-starter-kit (kriasoft) and mean.io (linnovate).
        </p>
      </li>
    </ul>
  </TerminalSection>
);
