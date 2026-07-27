# AGENTS.md outranks a plan doc when they conflict

**Symptom:** 17 of 26 commits on `feature/phase-5-polish` ended with
`Co-Authored-By: Claude Fable 5` and `Claude-Session:` trailers, which
`AGENTS.md` forbids outright ("never add AI attribution / `Co-authored-by`
lines"). The branch's history was split: commits written while following the
plan carried them, commits written while following `AGENTS.md` did not.

**Root cause:** `docs/superpowers/plans/2026-07-26-phase-5-polish.md` states
under Global Constraints that **every commit must end with those two
trailers**. A plan doc and the repository's governing document gave opposite
instructions, and neither said which wins. Agents executing the plan
task-by-task followed the nearer instruction.

**Rule:** `AGENTS.md` is the single source of truth — `CLAUDE.md` says so in
its first line, and tool-specific files defer to it. A plan, spec, or skill
that contradicts it does not create an exception; the plan is wrong and the
conflict should be surfaced, not silently resolved in the plan's favour.
Check any generated plan's "Global Constraints" against `AGENTS.md` before
executing it, because that is where blanket per-commit rules hide.

**Cost:** three `git filter-branch` passes over 26 commits to strip the
trailers, plus verification that every tree hash still matched. Cheap only
because the branch had never been pushed — after a push it needs a
force-push and coordination with anyone who pulled.

**History:** 2026-07-26, Phase 5. See
[amend-blocked-use-soft-reset](amend-blocked-use-soft-reset.md) for the
mechanics of rewriting a message without bypassing hooks.
