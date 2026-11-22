# A global with drafts can be never-saved, draft-only, or unpublished

**Symptom:** two faults in the first draft of Site settings (2026-11-22), both
from treating a global with `versions: { drafts: true }` as either "empty" or
"published".

1. The admin shows an **Unpublish** button on a global. Pressing it sets the
   record's `_status` to `draft`. The repository required `published`, so it
   threw for every visitor: per-request routes answered 500 and the next
   build failed, with nothing in the admin warning that the button takes the
   site down.
2. The Seed decided the settings were missing when the record had no
   `createdAt`. A draft saved **before anything was ever published** creates
   no record at all — only a version — so the Seed would have published its
   own values over the owner's first draft, against its one promise.

**Root cause:** a drafts-enabled global has more states than a row in a
table. Never saved: no record, no versions. Draft-only: no record, one or
more versions. Published: a record with `_status: 'published'`. Unpublished:
a record with `_status: 'draft'`, whose content may also have been edited in
the same save. The published state was the only one exercised.

**Rule:**

- Code that asks "does it exist?" checks the versions as well as the record
  (`countGlobalVersions`).
- Code that serves visitors must have an answer for **unpublished**. For a
  global the site cannot render without, the answer is the last version that
  was published (`findPublishedSiteSettings`), never an error.
- Hooks cannot veto an unpublish reliably: `beforeChange` sees
  `_status: 'draft'` for a draft save and for an unpublish alike, and the
  Local API does not put `draft` on the request.
- Write the integration specs from the admin's buttons, not from the happy
  path: Save draft first, Publish, Save draft again, Unpublish, Publish.

**History:** 2026-11-22, PR 2 of the page builder. Both found by the spec
review before the branch was pushed.
