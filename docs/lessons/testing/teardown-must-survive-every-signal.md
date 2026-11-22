# A teardown that only survives Ctrl-C leaks on every other way to stop

**Symptom:** the first draft of the Docker launcher behind `pnpm build:ci` and
`pnpm e2e` (2026-11-22, `src/lib/harness/`) listened for `SIGINT` alone. It
was tested by interrupting a run mid-build, the containers were gone
afterwards, and the teardown was called done. A reviewer then pointed out
that `kill`, a closed terminal, or a caller's timeout ends the launcher
before its `finally` runs, leaving a Mongo container, a network and a 3 GB
image behind — with nothing that ever sweeps them up.

**Root cause:** two different things were treated as one. Ctrl-C works by
accident of the terminal: it signals the whole foreground process group, so
the `docker` CLI is interrupted too and stops its own container. The launcher
only had to stay alive. A signal aimed at the launcher alone reaches nobody
else, so the launcher has to do the stopping. The one case that was tested
was the one case that needs no help.

It is also the least likely case for an agent. An agent's command that
overruns is ended with `SIGTERM` (then `SIGKILL`), never with Ctrl-C.

**Rule:**

- A process that owns containers, servers or temp state handles `SIGINT`,
  `SIGTERM` and `SIGHUP`, and on each one actively stops what it owns — it
  does not merely survive and wait for a child to notice.
- Test the teardown with a signal sent to that process alone
  (`kill -TERM <pid>`), not only to its process group. If only the group
  signal was tried, the teardown has not been tested.
- Say what cannot be handled. `SIGKILL` cannot be caught, so the docs name
  the command that removes what it leaves behind.
- Prefer an early teardown that is allowed to fail quietly plus a final one
  that reports: the early one races the command it is stopping.

**History:** 2026-11-22, PR 1 of the page builder. Found by the spec review
before the branch was pushed; fixed by `withTearDown` in
`src/lib/harness/docker-harness.ts` and proven with a lone `SIGTERM`.
