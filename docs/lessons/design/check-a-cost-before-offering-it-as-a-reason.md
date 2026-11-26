# Check a cost before putting it in front of the owner as a reason

**Symptom:** asked on 2026-11-25 how links should be typed into the CV, the
owner was given two options. The rich-text one was described as needing "a
script you run against the live database before or with the deploy", and
"~60 small editors". Neither had been checked. The owner chose it anyway.
The work then found that no script was needed at all — a read hook on the
field hands the stored plain text over as rich text — and that the CV has 44
such fields, not 60.

**Root cause:** the question was written from what a change of field type
usually costs, before reading how Payload orders its read hooks or counting
the fields in the Seed. Both checks took minutes. The costs were stated in
the same voice as the facts beside them, so nothing marked them as guesses.
Had the owner picked the other option because of them, the decision would
have rested on a cost that did not exist.

**Rule:**

- A cost offered to the owner as a reason to choose is a claim like any
  other: check it first, or say in the option that it is an estimate and
  what would settle it.
- For a change of field type on content the live site already holds, the
  questions to answer before asking are: what does a read hand back for the
  old value, what does a save that leaves the field out do with it, and how
  many places hold it. `src/collections/page-blocks/cv-text.int.spec.ts`
  shows how to ask all three of a real Payload.
- When the work finds a stated cost was wrong, say so in the report, in
  those words, rather than letting the better outcome pass as the plan.

**History:** 2026-11-25, links in the CV. Caught while building, before the
branch was pushed. This is the sibling of
[a-record-states-only-what-was-decided](a-record-states-only-what-was-decided.md):
that one is about a reading written down as a decision, this one about an
estimate handed over as a fact.
