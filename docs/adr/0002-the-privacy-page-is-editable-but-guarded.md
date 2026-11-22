# The privacy Page is editable, but guarded

The privacy policy was a code-owned page whose legal claims — retention
periods, the controller, third-party disclosures — were pinned by seventeen
specs, because those claims describe what the code does. The owner chose to
make it a Page like any other so the policy can be edited in the admin. We
kept the parts that can break a visitor's rights out of reach and accepted
that the prose is no longer tested once it has been edited.

## Considered options

- **Leave privacy code-owned.** Recommended during design and declined by the
  owner; it would have kept every claim under test and in git history.
- **Fully free rich text.** Rejected: one accidental deletion would remove the
  visitor's way to withdraw consent.

## Consequences

- The cookie inventory and the manage-preferences control are Blocks with no
  editable text; what they show still comes from the consent code.
- The privacy Page cannot be published without both of those Blocks.
- "Last updated" is the date of the last publish, never a typed date.
- Published versions are kept; the admin's history, not git, is the record of
  what the policy said on a given date.
- The claim specs assert against the Seed's privacy content. They guard the
  starting text and every Capture, but not an edit between Captures: if the
  code's behaviour changes, updating the policy prose is a manual step.
