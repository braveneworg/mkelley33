# A file the Seed uploads has not left the repo

**Symptom:** while designing the page builder (2026-11-22) the owner was told
twice that a file would be "removed from the repo" once it moved into the
CMS — the headshot, then the Resume ("one Resume, not two"). Both statements
were wrong by the time the Seed was designed: CI seeds an empty database
before every build, so the Seed must carry both files to upload them. They
leave `public/`, not the repo, and the repo's copy is whatever the last
Capture held.

**Root cause:** "moves into the CMS" was treated as "leaves source control"
without asking what recreates the record on an empty database. Each decision
was answered on its own instead of against the one already on the table — a
committed Seed that has to rebuild the whole site.

**Rule:** before saying any content or file leaves the repo, check whether
the Seed has to recreate it. If it does, the accurate statement is "it stops
being served from `public/` and becomes a Seed input", and the owner should
hear the consequence: the repo still holds a copy, it is public, and it is
only as fresh as the last Capture.
