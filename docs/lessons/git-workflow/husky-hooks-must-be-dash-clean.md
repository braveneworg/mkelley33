# Husky hooks run under dash, and dash is stricter than bash

**Symptom:** `.husky/pre-push` exited **2 with a completely empty log** on the
CI runner while passing on macOS. No error, no message — the elaborate
diagnostics the hook writes to fd 3 never ran, because the shell was gone
before it reached them.

**Root cause:** one line, unchanged since the hook was written:

```sh
if [ -e /dev/tty ] && { : >>/dev/tty; } 2>/dev/null; then
```

`:` is a POSIX **special built-in**, and the standard says a redirection error
on a special built-in "shall cause a non-interactive shell to exit." dash
enforces that. bash does not. `/dev/tty` exists but cannot be _opened_ when the
process has no controlling terminal — a CI runner, a hook spawned by a GUI git
client, a test harness — so the redirect failed and dash killed the script on
the spot. `2>/dev/null` suppressed the message but not the exit.

The irony is exact: that block exists to decide whether a TTY is available, and
the code below it exists to report failures when there is none. Neither could
run in the case they were written for.

**Rule:**

- Probe with a **subshell**, not a brace group, so a failed redirection is
  confined: `( : >>/dev/tty ) 2>/dev/null`. A brace group runs in the current
  shell, and the special-built-in rule then applies to that shell.
- The special built-ins are: `break`, `:`, `continue`, `.`, `eval`, `exec`,
  `exit`, `export`, `readonly`, `return`, `set`, `shift`, `times`, `trap`,
  `unset`. Redirecting any of them onto a path that might not open is the same
  trap. `true` is _not_ special and would also have been safe here.
- **Syntax checking cannot catch this, in either shell.** `sh -n` on macOS is
  bash in POSIX mode, so it is the wrong dialect to begin with — but `dash -n`
  passed too, because the script is perfectly valid dash. The abort is a
  _runtime_ condition: the redirect only fails when `/dev/tty` cannot be
  opened. The single check worth running is the real one — execute the hook
  under `/bin/dash` with the input git would give it. macOS ships
  `/bin/dash`, so there is no excuse for skipping it.
- Husky invokes hooks with `sh`. On Debian and the GitHub runners that is dash,
  so every hook in `.husky/` is dash code whether or not it was written that
  way.

**How it was found:** `src/pre-push-hook.spec.ts` was added to cover an
unrelated branch-guard bug, and it was the first thing ever to execute the hook
on Linux. The spec now runs each case under both `/bin/sh` and `/bin/dash`
(`SHELLS`), which is what keeps this class visible from a Mac. Any new hook
logic belongs in that spec for the same reason.

**Scope:** this had been broken for every Linux contributor since the hook was
written — pushes died with a bare status 2 and no explanation. It went
unnoticed only because the work happened on macOS.

**History:** 2026-07-27, found by CI on PR #9, fixed in `ad24fa1`. See
[amend-blocked-use-soft-reset](amend-blocked-use-soft-reset.md) for the other
pre-push behaviour worth knowing.
