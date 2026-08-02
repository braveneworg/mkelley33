# Blog comments — design

Date: 2026-08-02. Status: approved by owner (approach + product decisions
chosen interactively).

## Problem

Blog posts have no way for readers to respond. The owner asked for Disqus or
"a library like Disqus where I can manage the comments."

## Decision: Payload-native comments

Disqus was rejected: its free tier injects ads and trackers, which would force
a new consent category, a consent-version bump re-prompting every visitor,
privacy-policy changes naming Disqus Inc., and cookie cleanup on withdrawal —
all fighting the privacy posture shipped in PRs #43/#44. Giscus was offered
and declined in favour of full ownership.

Comments become a first-party Payload collection, moderated in `/admin`. No
third parties, no new cookies or localStorage, so `CONSENT_INVENTORY` and the
consent categories are untouched.

## Product decisions (owner-approved)

- **Moderation**: every submission lands `pending`; only `approved` renders
  publicly; `spam` is the third state. Moderation happens in the Payload
  admin.
- **Threading**: one-level replies — top-level comments plus one reply level;
  a reply can never have children. Enforced server-side.
- **Identity**: display name required; email optional and never rendered
  publicly (admin-eyes only, for moderation follow-up).
- **Notification**: the owner gets an email on each new submission, reusing
  the contact-form notify pipeline (`sendEmail` + a new template). No new env
  vars.
- **Format**: plain text with preserved line breaks (`whitespace-pre-wrap`).
  No markdown/HTML parsing surface in v1.

## Architecture

- **Write path** (anonymous, hardened): client form (`useGuardedForm` +
  Turnstile) → Server Action `submitComment` → `runFormSubmission` (honeypot →
  Zod → Turnstile verify → persist → notify). The collection sets
  `create: () => false`; the action persists with `overrideAccess: true` —
  the same pattern as `contact-submissions` and `subscribers`.
- **Read path**: the post page (Server Component, ISR 300s) reads approved
  comments through `src/lib/repositories/comments.ts` with
  `overrideAccess: false`. A comments `afterChange`/`afterDelete` hook
  revalidates `/blog/{slug}` (mirroring `revalidate-post.ts`), so approval in
  the admin appears promptly; the 300s ISR window is the safety net.
- **Integrity gate**: a collection `beforeValidate` hook is the single
  authoritative check that the target post exists and is published, the
  parent belongs to the same post, and the parent is itself top-level (depth
  cap). Hooks run under `overrideAccess: true`, so every write path is
  covered.
- **Email-leak guard**: `authorEmail` carries field-level
  `access.read: ({ req }) => Boolean(req.user)`. The public REST
  (`/api/comments`) and GraphQL mounts strip it for anonymous callers, as do
  user-less local-API reads. Tested at the access table and integration
  levels.

## Anti-abuse posture

Honeypot + Turnstile (as contact/newsletter), body 2–2000 chars, name ≤80,
email ≤254, at most 2 `http(s)://` links per body (Zod refinement), read
limit 200 per post. Everything lands `pending`, so moderation is the real
backstop.

## Out of scope (v1)

Markdown, avatars/Gravatar, comment counts on the blog index, pagination,
commenter accounts, edit/delete by commenters, rate limiting beyond
Turnstile.
