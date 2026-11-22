# A field's own `validate` switches off `required`

**Symptom:** the first draft of Site settings (2026-11-22) declared the GitHub
and LinkedIn links as `{ required: true, validate: validateHttpsUrl }`. The
validator let an empty value through on purpose — "whether the link may be
empty is the field's `required`" — and the admin still showed the red
asterisk. The owner could nevertheless publish both links blank, which
renders as empty `href`s in the footer, the command palette and the Person
JSON-LD.

**Root cause:** Payload does not enforce `required` on its own. It is one of
the things a field type's **default validator** checks, and Payload installs
that default only when `field.validate` is undefined
(`payload/dist/fields/config/sanitize.js`). A field with a validator of its
own has no default, so `required: true` is left as a label in the admin and
nothing else.

**Rule:**

- A custom `validate` must enforce presence itself when the field is
  required. Here that is a second validator, `validateRequiredHttpsUrl`,
  rather than a flag: the two cases read differently at the call site.
- Keep `required: true` on the field as well. It still drives the admin's
  marker and the generated type.
- Prove it against real Payload, not the validator alone: an integration
  spec that publishes with the field empty and expects a rejection. The unit
  spec for `validateHttpsUrl` was green the whole time.

**History:** 2026-11-22, PR 2 of the page builder. Found by the spec review
reading Payload's source, before the branch was pushed.
