# A decision record states only what the owner decided

**Symptom:** ADR 0003 said "Only the database is containerised; the site is
still built on the host." The owner had said "everything else runs in docker,
but is not hosted on docker." Asked directly on 2026-11-22, the owner
answered that the build and the tests themselves run inside containers
locally. The record held the opposite, written as fact, and PR 1 of the page
builder had been scoped from it.

**Root cause:** the owner's sentence had two readings, a small one and a
large one. The small one was chosen, stated back in a table beside other
items, and the absence of an objection was taken as agreement. It then went
into the decision record in the same voice as the things the owner had
actually said, so nothing in the record marked it as a guess. The handoff
note did flag it as unconfirmed; the record did not.

**Rule:**

- A decision record or a spec's decisions section holds only what the owner
  said or explicitly confirmed. A reading goes under open points, phrased as
  a question, until it is answered.
- Not objecting to a table is not confirmation. Ask each reading as its own
  question: quote the owner's words and name both readings.
- When a sentence has a cheap reading and an expensive one, ask before
  scoping any work from either.

**History:** 2026-11-22, PR #54. Caught before any code was written, because
the three readings were asked one at a time. The first two were confirmed;
the third was not. The correction itself needed a follow-up question: the gate and
the unit tests stay on the host, and it is `build:ci` and `e2e` that run in
containers. That was asked with the options spelled out before the record
was rewritten.
