/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * The heading of a Page: its `$ command` line, its title, and its intro.
 * They are fields on the Page rather than a Block (owner's decision,
 * 2026-11-23), which is what guarantees a Page exactly one main heading.
 *
 * `document` is the plainer form the CV uses: the title as it is, with no
 * `#` in front, and the intro in the monospace of a letterhead.
 *
 * `lastPublished` is a date (`2026-08-02`) shown after the intro as "Last
 * updated". It is given by the code, from the Page's last publish — there
 * is no field to type one into (docs/adr/0002).
 */
export const PageHeading = ({
  command,
  intro,
  lastPublished,
  title,
  variant,
}: {
  command?: null | string;
  intro?: null | string;
  lastPublished?: string;
  title: string;
  variant: 'document' | 'standard';
}) => (
  <header className="mx-auto w-full max-w-5xl px-5 pt-16 pb-5 sm:pt-20">
    {command ? (
      <p className="text-fg-muted font-mono text-sm print:hidden">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        {command}
      </p>
    ) : null}
    {variant === 'document' ? (
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">{title}</h1>
    ) : (
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        <span aria-hidden="true"># </span>
        {title}
      </h1>
    )}
    {intro || lastPublished ? (
      <p
        className={
          variant === 'document'
            ? 'text-fg-muted mt-2 font-mono text-sm'
            : 'text-fg-muted mt-3 max-w-2xl leading-relaxed'
        }
      >
        {intro}
        {lastPublished ? (
          <>
            {intro ? ' ' : null}Last updated <time dateTime={lastPublished}>{lastPublished}</time>.
          </>
        ) : null}
      </p>
    ) : null}
  </header>
);
