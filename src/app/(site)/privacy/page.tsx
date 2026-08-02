/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Link from 'next/link';

import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { ManageCookiePreferences } from '@/components/consent/manage-cookie-preferences';
import { CONSENT_CATEGORIES } from '@/lib/consent/inventory';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  description:
    'What this site measures, who receives it, how long it is kept, and the choices you keep.',
  title: 'privacy',
};

const H2_CLASSES = 'text-phosphor mt-10 font-mono text-lg font-bold';
const BODY_CLASSES = 'text-fg mt-3 max-w-2xl leading-relaxed';
const LIST_CLASSES = 'text-fg mt-3 max-w-2xl list-disc space-y-2 pl-6 leading-relaxed';

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        cat ./privacy.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        <span aria-hidden="true"># </span>privacy
      </h1>
      <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
        What this site measures, who receives it, and the choices you keep. Last updated 2026-08-02.
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>who
      </h2>
      <p className={BODY_CLASSES}>
        Michaux Kelley runs this site and is the data controller. For any question or request about
        your data, use the{' '}
        <Link className="link-draw text-phosphor" href="/contact">
          contact form
        </Link>
        .
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>what &amp; why
      </h2>
      <ul className={LIST_CLASSES}>
        <li>
          <strong>analytics</strong> — Google Analytics 4 (pages visited, referrers, rough
          geography; GA4 drops IP addresses at collection) and Vercel Analytics (cookieless,
          aggregate page metrics). Legal basis: consent. Neither loads until you allow it in the
          cookie form.
        </li>
        <li>
          <strong>contact form</strong> — name, email, and message, emailed to me so I can respond.
          Legal basis: taking steps prior to entering a contract.
        </li>
        <li>
          <strong>newsletter</strong> — your email plus double-opt-in confirmation and unsubscribe
          tokens, stored in the site database. Legal basis: consent; unsubscribing withdraws it.
        </li>
        <li>
          <strong>bot protection</strong> — Cloudflare Turnstile on the contact and newsletter forms
          processes IP and browser signals to keep bots out. Legal basis: legitimate interest in
          site security.
        </li>
        <li>
          <strong>hosting</strong> — Vercel serves this site and processes IP addresses in server
          logs as a technical necessity of delivering it. Legal basis: legitimate interest in
          operating the site.
        </li>
      </ul>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>who receives it
      </h2>
      <p className={BODY_CLASSES}>
        Google LLC (analytics), Vercel Inc. (hosting and analytics), Cloudflare Inc. (bot
        protection), and an email delivery provider (contact and newsletter mail). Transfers to the
        US rely on the EU-US Data Privacy Framework. See the{' '}
        <a
          className="link-draw text-phosphor"
          href="https://policies.google.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >
          google privacy policy
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        ,{' '}
        <a
          className="link-draw text-phosphor"
          href="https://policies.google.com/technologies/partner-sites"
          rel="noopener noreferrer"
          target="_blank"
        >
          how google uses partner data
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        , and the{' '}
        <a
          className="link-draw text-phosphor"
          href="https://www.cloudflare.com/privacypolicy/"
          rel="noopener noreferrer"
          target="_blank"
        >
          cloudflare privacy policy
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        .
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>cookies &amp; storage
      </h2>
      <p className={BODY_CLASSES}>
        Analytics never runs before you allow it. Change your mind anytime — with the button below
        or the phosphor block pinned to the bottom-left corner of every page.
      </p>
      {CONSENT_CATEGORIES.map((category) => (
        <section className="mt-6" key={category.id}>
          <h3 className="font-mono text-sm font-bold">{category.title}</h3>
          <div className="mt-2 max-w-2xl">
            <CookieInventoryTable category={category.id} />
          </div>
        </section>
      ))}
      <div className="mt-6">
        <ManageCookiePreferences />
      </div>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>retention
      </h2>
      <p className={BODY_CLASSES}>
        Analytics event data is kept for 14 months, then deleted. Contact messages are kept only as
        long as needed to handle them. Newsletter data is kept until you unsubscribe.
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>your rights
      </h2>
      <ul className={LIST_CLASSES}>
        <li>
          withdraw consent at any time — it is as easy as giving it. withdrawing does not affect the
          lawfulness of anything processed under that consent before you withdrew it.
        </li>
        <li>ask for access to, correction of, or erasure of your data.</li>
        <li>ask for restriction of processing while a request or objection is being resolved.</li>
        <li>object to processing carried out under legitimate interest.</li>
        <li>
          ask for data portability — your data handed back in a structured, machine-readable form.
        </li>
        <li>lodge a complaint with your local supervisory authority.</li>
      </ul>
    </div>
  );
}
