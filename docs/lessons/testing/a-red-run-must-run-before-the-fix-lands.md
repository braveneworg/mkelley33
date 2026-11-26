# A red run must run before the fix lands

**Symptom:** the sticky-header specs were written and their run kicked off
in the background, the implementation was edited in while that run was still
installing dependencies, and the run came back all green. It never saw the
specs fail, so it proved nothing about whether they could.

**Root cause:** a backgrounded test command reads the working tree whenever
it actually starts, not when it was launched. Editing source while it is
pending puts the fix in front of the "red" run.

**Rule:**

- Wait for the red run to finish, and read the failures, before touching
  the implementation.
- If the order slipped, prove red after the fact: copy the implementation
  files to the scratchpad, `git checkout --` them, run the specs, then copy
  them back. Never use a throwaway commit with `--no-verify` for this — hooks
  are never bypassed, not even for a temporary commit.
