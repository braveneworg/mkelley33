# Gitleaks flags `*KEY*` constants assigned string literals

**Symptom:** pre-commit died with "gitleaks detected secrets in staged
changes" on a docs-only commit. The findings were the
`CONSENT_STORAGE_KEY` constant being assigned its value (the public
localStorage slot name `mkelley33.consent.v1`) in a plan document's code
blocks. Writing this very lesson tripped the rule a second time, because
its symptom line originally quoted the assignment verbatim.

**Root cause:** gitleaks' `generic-api-key` rule matches any identifier
containing `KEY` (also `TOKEN`, `SECRET`, `PASSWORD`, …) assigned a quoted
string whose entropy clears the rule's threshold. It scans every staged
file, markdown included, so plan/spec documents that quote real code hit
the same rules the code itself will.

**Rule:**

- For a genuine false positive, put the documented inline escape on the
  **same line** as the match, with the reason first:

  ```ts
  export const CONSENT_STORAGE_KEY = 'mkelley33.consent.v1'; // public storage slot name — gitleaks:allow
  ```

  The comment travels with the code, so the plan's code block and the
  eventual source file both pass without config changes.

- In prose, separating the identifier from its `= 'value'` (e.g.
  `` `CONSENT_STORAGE_KEY` (the versioned localStorage slot …) ``)
  breaks the regex without any escape.
- Never "fix" it by weakening the hook, committing with `--no-verify`
  (forbidden anyway), or renaming a constant to something dishonest just
  to dodge the scanner. If a whole class of paths needs allowlisting,
  that is a visible `.gitleaks.toml` decision, not scattered escapes.
- Real secrets never get `gitleaks:allow`. The escape is for values that
  are public by nature — storage slot names, well-known test keys,
  documented example IDs.

**History:** 2026-08-01, `feat/privacy-cookie-consent` — the consent
implementation plan's Task 1 code blocks tripped the rule twice; fixed
with the inline allow plus a plan note telling the implementer to keep
it.
