# Never spawnSync in a process that owns a piped child

**Symptom:** `mongod` from `mongodb-memory-server` wedges mid-operation —
an in-flight op never answers, the client hangs forever, and every retry
on a fresh instance wedges identically at the first heavy workload (e.g.
seeding: collection + index creation). Cost us five failed E2E harness
runs and hours of misdiagnosis (sandbox, `.env.local`, spawn flake) in
Phase 5 Task 8 (2026-07-26).

**Root cause:** `mongodb-memory-server` spawns `mongod` with **piped**
stdout/stderr (it parses them for readiness), and those pipes are drained
by the owning process's event loop. `spawnSync` blocks that event loop
for the entire child's duration. Once `mongod`'s log output fills the
~64 KB OS pipe buffer, `mongod` blocks on the write and the whole server
stalls. Deterministic, not a flake. The vitest int harness never hits it
because vitest's event loop stays live.

**Rule:** in any script that owns a `MongoMemoryServer` (or any child
spawned with piped stdio), never call `spawnSync`/blocking work while the
child lives. Use async `spawn` and `await` a close-promise so the event
loop keeps draining. `scripts/e2e.mjs` does this correctly — keep it that
way.

**Known remaining instance:** `scripts/ci-build.mjs` still wraps its
build in `spawnSync` while owning a `MongoMemoryServer` — this is the
likely root cause of the historical `build:ci` prerender-hang flake class
(the reason the "retry once" flake protocol exists). Converting it to
async spawn should end that flake family.
