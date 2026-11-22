# `read: () => true` on an upload collection publishes every upload

**Symptom:** the Resume's upload collection (2026-11-22) was given
`read: () => true`, with the comment "the Resume is published for download;
anyone may read it." That made every file in the collection public the
moment it was uploaded: one attached only to a draft of Site settings, one
that had been replaced, one never attached to anything. All were listed at
`/api/resume-files` and served at `/api/resume-files/file/<name>`.

**Root cause:** the access rule was written for the one file the site links
to, but it applies to the collection. An upload collection is also a REST
resource, and "the owner uploaded it" is not "the owner published it" — the
draft/publish state lived on Site settings, one relation away.

**Rule:**

- Public read on an upload collection means "every file ever uploaded here
  is public". If that is not the intent, the rule must name what is public:
  here, exactly the upload the **published** Site settings point at, as a
  `where` on the id; everything else needs a signed-in user.
- Returning `false` from a read rule makes a visitor's list request fail
  with 403; returning a `where` filters it. Both are fine, and specs must
  expect the right one.
- The storage plugin matters too. Vercel Blob keys were the bare file name
  with overwrite allowed, so a second upload of the same name replaced the
  first **in storage** even from another database. `addRandomSuffix: true`
  gives every upload its own key.

**History:** 2026-11-22, PR 2 of the page builder. Found by the spec review
before the branch was pushed.
