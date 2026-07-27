# A trailing `echo` destroys the exit status you cared about

**Symptom:** CI on PR #9 was reported as passing. It had failed — the `ci` job
was red the whole time, and the branch sat green in the summary for a full
message before anyone noticed.

**Root cause:** not the tool. The command was run in the background as:

```sh
gh run watch "$RUN" --exit-status > ci.log 2>&1; echo "CI EXIT=$?"
```

`gh run watch --exit-status` did exactly its job: it exited **1**, and its own
output ended with `X Process completed with exit code 1`. But the status of a
`a; b` list is the status of `b`, and `b` was an `echo` — which always
succeeds. The runner therefore reported the whole line as exit code 0, and that
0 was read as "CI passed" without opening the captured output, which contained
the literal line `CI EXIT=1`.

Two separate mistakes stacked: shaping a command so the interesting status was
overwritten, and then treating a wrapper's status as evidence about something
it never measured.

**Rule:**

- Never append `; echo ...` after a command whose exit status matters. If a
  label is wanted, capture first and print second:
  `cmd; code=$?; echo "exit=$code"` — and then actually read that line, not the
  wrapper's status.
- A background runner reports the status of the **shell line**, not of the
  interesting command inside it. `cmd > log 2>&1` alone preserves the status;
  anything appended after `;` replaces it.
- For CI specifically, do not infer from any exit code. Ask for the verdict
  directly, because it is unambiguous and cannot be masked by shell plumbing:

  ```sh
  gh run view "$RUN" --json conclusion,jobs \
    --jq '.conclusion, (.jobs[] | "\(.name): \(.conclusion)")'
  ```

  A finished watch means the run **ended**, never that it **passed**.

- Same discipline for the suite: `Test Files 59 passed (59)` is evidence;
  "the command came back" is not. Prefer a field or a counted line over a
  status whenever one exists.

**History:** 2026-07-27, PR #9. The first report of a green CI was wrong, and
the correction only happened because the job list was pulled separately
afterwards. `gh` was blameless — worth stating, because the first write-up of
this lesson blamed it and had to be retracted.
