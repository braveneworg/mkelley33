# An array field that was never stored reads as `[]`

**Symptom:** PR 3 of the page builder (2026-11-23) added two menus to Site
settings, which already existed on the live site. The Seed is fill-only, so
it had to add the menus to a record that had never had them and leave alone
a menu the owner had emptied on purpose. Read through Payload, the two are
the same value: `findGlobal` returned `headerMenu: []` for a record with no
such field, and `[]` again after a save with an empty menu.

**Root cause:** Payload fills in an array field's default when it reads, and
writes the field out on every save. The difference between "never had it"
and "has it, empty" exists only in the stored record: one saved before the
field was added to the config does not have the key at all.

**Rule:**

- To ask whether a record has ever had a field, read the stored record, not
  the API. `storedGlobalFields` in `src/lib/seed/stored-fields.ts` is the one
  place that does it, through the Mongo connection; keep such reads there.
- A spec can only reproduce the live record by removing the field from
  storage (`$unset`). A save through Payload always writes it, so a spec
  that builds its fixture with `updateGlobal` is testing the wrong record.
- Adding a field to an existing global is a data question as well as a
  schema one: decide, with the owner, what the records that predate it get.

**History:** 2026-11-23, PR 3. Found by probing before any fill logic was
written, which is why the first version was the right one.
