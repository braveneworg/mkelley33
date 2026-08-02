# Git hooks export GIT_DIR, and a spec's sandbox git inherits it

**Symptom:** `src/pre-push-hook.spec.ts` passed when run directly but failed
every time `vitest --changed` ran it from inside the pre-commit hook — dying
in `createSandbox` on

```text
Error: Command failed: git … remote add origin /var/…/pre-push-gate-…/remote.git
```

so no commit touching that spec could land, including the one trying to fix
the situation.

**Root cause:** git exports `GIT_DIR` and `GIT_INDEX_FILE` into the
environment of every hook it runs. A child `git` process that inherits
`GIT_DIR` **ignores its `cwd`** and operates on the repository `GIT_DIR`
points at. The sandbox's `git('remote', 'add', 'origin', …)` therefore ran
against the real repository — where `origin` already exists — instead of the
throwaway repo the `cwd` named. Outside a hook the variables are absent, so
the suite was green everywhere else: direct runs, `pnpm gate`, CI.

**Rule:**

- A spec that spawns `git` against a fixture repository must hand it an
  environment scrubbed of every `GIT_*` variable — `cwd` alone does not pin
  the repository:

  ```ts
  const sandboxEnv: NodeJS.ProcessEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_'))),
    NODE_ENV: process.env.NODE_ENV, // Next.js requires it on ProcessEnv
  };
  ```

  and pass `env: sandboxEnv` to every `execFileSync`/`spawn` in the fixture,
  including the hook invocation itself.

- Reproduce the hook environment deterministically instead of committing to
  find out: `GIT_DIR="$(git rev-parse --absolute-git-dir)" pnpm exec vitest
run <spec>` fails exactly the way pre-commit does.
- The trap is invisible to CI, which never runs the suite from inside a git
  hook. Any new spec that builds a git fixture should get the simulated-hook
  run once before it ships.

**History:** 2026-08-01. The sandbox arrived in PR #36 (single-gate); the
failure surfaced days — commits — later, when a merge on another branch made
the spec "changed" and pre-commit ran it inside a hook for the first time.
Fixed in the merge commit that hit it, on `refactor/turnstile-seam`.
