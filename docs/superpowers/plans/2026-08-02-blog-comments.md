# Blog comments — implementation plan

Spec: [`../specs/2026-08-02-blog-comments-design.md`](../specs/2026-08-02-blog-comments-design.md).
Branch: `feat/blog-comments` in `.claude/worktrees/feat-blog-comments`.

Constraints: `AGENTS.md` governs (TDD, MPL header on every new source file,
named exports, arrow functions, no lint suppressions, specs adjacent, vitest
globals, one condition per test, `Map` over computed record access, 95%
coverage via `pnpm gate`). Conventional Commits per
`docs/lessons/git-workflow/commit-format.md`; no AI attribution trailers.

## Steps (TDD: failing test first in every step)

1. **Validation** — `src/lib/validation/comments.ts` + spec.
   `commentSchema`: `authorName` trim 1–80; `authorEmail` `''` or valid email
   ≤254; `body` trim 2–2000, ≤2 `http(s)://` links (refinement); `parentId`
   string ≤64 (`''` = top-level); `postId` 1–64; `turnstileToken` min 1;
   `website: z.literal('')` (honeypot). Empty-string sentinels keep the
   `useGuardedForm` `defaultValues` contract.

2. **Collection hooks** — `src/collections/hooks/validate-comment.ts` +
   `revalidate-comment.ts` + specs (mirror `revalidate-post.spec.ts`
   mocking style).
   - `validate-comment`: `beforeValidate`; on create (or when `data.post` /
     `data.parent` present) `findByID` post (`depth: 0`) → `APIError` 400
     unless published; if `parent`: reject when parent has a `parent` (depth)
     or parent's post ≠ `data.post` (cross-post).
   - `revalidate-comment`: afterChange/afterDelete → resolve slug (populated
     object or `findByID`) → dynamic `import('next/cache')` with catch →
     `revalidatePath('/blog/{slug}')` only.

3. **Collection** — `src/collections/comments.ts`; register in
   `src/payload.config.ts`; extend `src/collections/access.spec.ts` with a
   Comments block (create false for ANON and ADMIN; anon read →
   `{ status: { equals: 'approved' } }`; admin read true; update/delete
   admin-only; `authorEmail` field `access.read` false/true) .
   Fields: `authorName` text req; `authorEmail` email opt w/ field read
   access; `body` textarea req; `post` rel→posts req indexed; `parent`
   rel→comments indexed; `status` select pending/approved/spam default
   pending req. All commenter fields `admin.readOnly`; only `status`
   editable. `admin.defaultColumns`, `useAsTitle: 'authorName'`.
   Then `pnpm generate:types` && `pnpm generate:importmap`.

4. **Repository** — `src/test/make-comment.ts` fixture;
   `src/lib/repositories/comments.ts` + unit spec (importFresh pattern) +
   `comments.int.spec.ts` (payload-harness): `createComment` (forces
   `status: 'pending'`, `overrideAccess: true`, `depth: 0`);
   `listApprovedCommentsForPost` (`cache()`, `overrideAccess: false`,
   `limit: 200`, sort `createdAt`, catch → `[]`). Int proofs: pending
   default; only approved listed; **no `authorEmail` in results**;
   reply-to-reply rejects; cross-post parent rejects; draft post rejects.
   Add `getPublishedPostById` to `src/lib/repositories/posts.ts` + spec.

5. **Email template** — `commentNotificationEmail` in
   `src/lib/email/templates.ts` + spec (post title + author in subject; body,
   moderation URL `${siteConfig.url}/admin/collections/comments/{id}`,
   `not provided` for empty email in text).

6. **Server Action** — `src/lib/actions/comments.ts` + spec (node env,
   mirror `contact.spec.ts` mocks). `submitComment` composes
   `runFormSubmission`; persist normalizes `''` → `undefined`, resolves post
   title for notify; notify emails `CONTACT_TO` (fallback per contact).

7. **Threading helper** — `src/lib/thread-comments.ts` + spec:
   `threadComments(comments)` → `CommentThread[]` via `Map`; orphaned
   approved replies promote to top-level; handles id-string vs populated
   `parent`.

8. **Components** (`src/components/blog/`, specs adjacent, test-first):
   - `comments-section.tsx` (server): heading idiom `$ cat ./comments`,
     count, empty state, list + top-level form.
   - `comment-list.tsx` (server): `<ol>` of `<article>`; name, `<time>`
     (slice(0,10)), body `whitespace-pre-wrap`; one nested replies `<ol>`;
     reply control only on top-level.
   - `comment-reply-control.tsx` ('use client'): closed by default; lazily
     mounts a reply form (Turnstile mounts only when open).
   - `comment-form.tsx` ('use client'): `useGuardedForm`, hidden honeypot,
     Turnstile, `FieldError`/`ErrorText`, success `role="status"` copy
     "comment queued — appears once approved ✓" (never promises immediate
     visibility).

9. **Page mount** — `src/app/(site)/blog/[slug]/page.tsx`: fetch approved
   comments, render `<CommentsSection>` between the adjacent-posts `<nav>`
   and the JSON-LD script. No page spec exists; do not add one just for this
   (coverage counts only imported files).

10. **Privacy page** — extend `src/app/(site)/privacy/page.tsx` + spec:
    comments bullet (name, optional never-published email, content; legal
    basis), bot-protection bullet gains comment form, retention line.
    Consent inventory untouched (no new cookies/storage).

11. **E2E** — read `e2e/AGENTS.md` IN FULL first (mandatory), plus
    `scripts/e2e.ts` and `src/lib/e2e/harness-config.ts`. Seed a published
    post before build (ISR invariant), `e2e/comments.spec.ts`: submit →
    queued copy → reload → body absent. Approval→visible stays at int level.

12. **Gate** — `pnpm gate` green; `pnpm e2e` green.

## Risks

1. Email leak via public REST/GraphQL — field-level access is the sole
   guard; tested twice; never weaken.
2. ISR staleness — success copy must say "appears once approved"; hook
   revalidation + 300s window.
3. Depth/cross-post enforcement lives in the `beforeValidate` hook (runs
   under `overrideAccess`), not the UI.
4. Coverage — every new module ships its spec in the same step; never import
   `page.tsx` from specs.
5. Types ordering — steps ≥4 need step 3's `pnpm generate:types` (custom
   script; upstream CLI broken on this Node/tsx combo).
