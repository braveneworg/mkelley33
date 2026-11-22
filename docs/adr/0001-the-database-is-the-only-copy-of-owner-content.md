# The database is the only copy of Owner content

Owner content used to live in source, and the one collection that had moved
into the CMS — Services — kept a hard-coded twin that the code fell back to
whenever the database was empty or unreachable. The twins drifted: `/services`
read the database while the home page still read the constant. With every
Page becoming editable in the admin, we decided the database holds the only
copy: the hard-coded content is deleted, nothing falls back to source, and a
build that cannot find a Fixed Page fails instead of rendering without it.

## Considered options

- **Keep source copies as a safety net.** Rejected: the site would always
  render something, but a database fault would silently show visitors content
  that went stale the first time the owner edited in the admin.

## Consequences

- The Seed is required, not a convenience — an empty database has no home
  page, so CI and the E2E harness seed before every build.
- Deploys have an order: the live database is seeded before code that needs
  new records ships. Seeding first is safe because the Seed only fills what
  is missing; deploying first fails the build and leaves the current site up.
- A brief database outage on the live site serves the last successfully built
  pages from cache rather than a fallback.
- Do not add a source fallback back to "harden" a repository. A missing
  record is a failed build or a 404 by design.
