# Privacy Page & Hard-Gated Cookie Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note (2026-08-02):** Task 8's cursor trigger and Task 10's footer `pb-16` were superseded by the content-sticky cookie trigger during pre-merge review of PR #43 — see the spec doc. The tasks below are left as executed, as the historical record.

**Goal:** An Art. 13-complete `/privacy` page plus a banner + in-depth preferences dialog that hard-gates Google Analytics AND Vercel Analytics behind explicit consent, with a persistent phosphor cursor-block reopen trigger.

**Architecture:** A framework-free consent core in `src/lib/consent/` (versioned, Zod-validated localStorage record; Consent Mode v2 helpers over a parse-time bootstrap script) consumed by a React context provider in `src/components/consent/`. The analytics surfaces (`GoogleAnalyticsTag`, a new `VercelAnalyticsTag`, `trackEvent`) render/send only when the provider grants analytics. UI is hand-rolled on the existing dialog primitive and design tokens — zero new dependencies.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind v4 tokens (`phosphor`/`edge`/`surface`/`canvas`/`fg`), Radix dialog (already installed), Zod v4, Vitest + RTL (jsdom), Playwright E2E via `pnpm e2e`.

**Spec:** `docs/superpowers/specs/2026-08-01-privacy-cookie-consent-design.md`

## Global Constraints

- Every new source file starts with the MPL header (above `'use client'`):
  ```
  /* This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
  ```
- Named exports only (pages keep their required `export default function`); arrow-function components; no `any`, no `!` non-null assertion; explicit param/return types on exported non-component functions; components match the existing no-return-annotation style.
- Vitest globals (`describe`/`it`/`expect`/`vi`) are NOT imported — they are ambient. `import type { ... } from 'vitest'` is allowed.
- `eslint-plugin-perfectionist` auto-sorts imports/props/keys. If lint complains about ordering, run `pnpm exec eslint --fix <file>` and re-stage; never hand-wave order errors.
- Commits: `type(scope?): <gitmoji> subject`, header ≤50 chars WITH the emoji counting as 2. Never `--no-verify`, never AI attribution. Pre-commit runs gitleaks + lint-staged + `vitest --changed`.
- Run all commands from the worktree root: `/Users/cchaos/projects/braveneworg/mkelley33/.claude/worktrees/feat-privacy-cookie-consent`.
- The Payload admin (`src/app/(payload)/`) stays untouched — consent mounts only in the `(site)` layout.
- E2E only via `pnpm e2e` (never against a running dev server); `e2e/AGENTS.md` invariants are binding.

---

### Task 1: Consent storage module

**Files:**
- Create: `src/lib/consent/consent-storage.ts`
- Test: `src/lib/consent/consent-storage.spec.ts`

**Interfaces:**
- Consumes: `zod` (v4, `import { z } from 'zod'`).
- Produces: `CONSENT_STORAGE_KEY` (the versioned localStorage slot `mkelley33.consent.v1`), `CONSENT_VERSION = 1`, `CONSENT_MAX_AGE_MS`, `interface ConsentRecord { analytics: boolean; decidedAt: string; version: number }`, `readConsent(now?: Date): ConsentRecord | null`, `writeConsent(analytics: boolean, now?: Date): ConsentRecord`, `hasAnalyticsConsent(now?: Date): boolean`.

> The storage-slot assignment carries a trailing `gitleaks:allow` comment — the value is a public localStorage key name that false-positives gitleaks' generic-api-key rule. Keep the comment when implementing; without it the pre-commit hook rejects the file.

- [ ] **Step 1: Write the failing test**

`src/lib/consent/consent-storage.spec.ts` (MPL header first, then):

```ts
import {
  CONSENT_MAX_AGE_MS,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  hasAnalyticsConsent,
  readConsent,
  writeConsent,
} from '@/lib/consent/consent-storage';

describe('consent storage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips a granted decision', () => {
    writeConsent(true);
    expect(readConsent()?.analytics).toBe(true);
  });

  it('reads as undecided when nothing is stored', () => {
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the stored value is corrupt JSON', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, '{not json');
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the record fails schema validation', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ analytics: 'yes' }));
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when the stored version is outdated', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        analytics: true,
        decidedAt: new Date().toISOString(),
        version: CONSENT_VERSION - 1,
      })
    );
    expect(readConsent()).toBeNull();
  });

  it('reads as undecided when decidedAt is not a parseable date', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, decidedAt: 'yesterday-ish', version: CONSENT_VERSION })
    );
    expect(readConsent()).toBeNull();
  });

  it('expires records older than twelve months', () => {
    const decidedAt = new Date('2025-01-01T00:00:00.000Z');
    writeConsent(true, decidedAt);
    const justPastExpiry = new Date(decidedAt.getTime() + CONSENT_MAX_AGE_MS + 1);
    expect(readConsent(justPastExpiry)).toBeNull();
  });

  it('honors records within the twelve-month window', () => {
    const decidedAt = new Date('2025-01-01T00:00:00.000Z');
    writeConsent(false, decidedAt);
    const wellBeforeExpiry = new Date(decidedAt.getTime() + 1000);
    expect(readConsent(wellBeforeExpiry)?.analytics).toBe(false);
  });

  it('hasAnalyticsConsent is true for a granted, valid record', () => {
    writeConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('hasAnalyticsConsent is false for a declined record', () => {
    writeConsent(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('hasAnalyticsConsent is false when undecided', () => {
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/consent/consent-storage.spec.ts`
Expected: FAIL — cannot resolve `@/lib/consent/consent-storage`.

- [ ] **Step 3: Write the implementation**

`src/lib/consent/consent-storage.ts` (MPL header first, then):

```ts
import { z } from 'zod';

/**
 * The consent decision persisted in localStorage. Client-editable external
 * input — every read passes through Zod. Bump CONSENT_VERSION on material
 * policy changes: every stored decision becomes undecided and visitors are
 * re-prompted.
 */
export interface ConsentRecord {
  analytics: boolean;
  decidedAt: string;
  version: number;
}

export const CONSENT_STORAGE_KEY = 'mkelley33.consent.v1'; // public storage slot name — gitleaks:allow
export const CONSENT_VERSION = 1;
/** Stored decisions expire after 12 months (CNIL-aligned re-prompt). */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

const consentRecordSchema = z.object({
  analytics: z.boolean(),
  decidedAt: z.string(),
  version: z.number().int(),
});

const safeLocalStorage = (): null | Storage => {
  try {
    // Accessing localStorage itself throws when storage is disabled.
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * Reads the stored decision. Missing, corrupt, wrong-version, unparseable,
 * or expired records all read as null (undecided) — never throws, so it is
 * safe in any render path. `now` exists for deterministic tests.
 */
export const readConsent = (now: Date = new Date()): ConsentRecord | null => {
  const storage = safeLocalStorage();
  if (!storage) {
    return null;
  }
  let raw: null | string = null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = consentRecordSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return null;
  }
  if (parsed.data.version !== CONSENT_VERSION) {
    return null;
  }
  const decidedAtMs = Date.parse(parsed.data.decidedAt);
  if (Number.isNaN(decidedAtMs)) {
    return null;
  }
  if (now.getTime() - decidedAtMs > CONSENT_MAX_AGE_MS) {
    return null;
  }
  return parsed.data;
};

export const writeConsent = (analytics: boolean, now: Date = new Date()): ConsentRecord => {
  const record: ConsentRecord = {
    analytics,
    decidedAt: now.toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    safeLocalStorage()?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage full or blocked: the decision still applies to this page
    // view; the visitor is simply re-prompted next visit.
  }
  return record;
};

export const hasAnalyticsConsent = (now: Date = new Date()): boolean =>
  readConsent(now)?.analytics === true;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/consent/consent-storage.spec.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent/consent-storage.ts src/lib/consent/consent-storage.spec.ts
git commit -m 'feat: ✨ add consent storage module'
```

---

### Task 2: Consent Mode v2 gtag helpers

**Files:**
- Create: `src/lib/consent/gtag.ts`
- Test: `src/lib/consent/gtag.spec.ts`

**Interfaces:**
- Consumes: nothing from this repo.
- Produces: `CONSENT_MODE_BOOTSTRAP: string`, `updateAnalyticsConsent(granted: boolean): void`, `deleteGaCookies(): void`.

- [ ] **Step 1: Write the failing test**

`src/lib/consent/gtag.spec.ts` (MPL header first, then):

```ts
import {
  CONSENT_MODE_BOOTSTRAP,
  deleteGaCookies,
  updateAnalyticsConsent,
} from '@/lib/consent/gtag';

interface GtagGlobals {
  gtag?: (...args: unknown[]) => void;
}

describe('CONSENT_MODE_BOOTSTRAP', () => {
  it('defines the global gtag queue function', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain('function gtag(){dataLayer.push(arguments);}');
  });

  it('defaults analytics_storage to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("analytics_storage:'denied'");
  });

  it('defaults ad_storage to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_storage:'denied'");
  });

  it('defaults ad_user_data to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_user_data:'denied'");
  });

  it('defaults ad_personalization to denied', () => {
    expect(CONSENT_MODE_BOOTSTRAP).toContain("ad_personalization:'denied'");
  });
});

describe('updateAnalyticsConsent', () => {
  afterEach(() => {
    delete (globalThis as GtagGlobals).gtag;
  });

  it('pushes a granted analytics_storage update through gtag', () => {
    const calls: unknown[][] = [];
    (globalThis as GtagGlobals).gtag = (...args) => {
      calls.push(args);
    };
    updateAnalyticsConsent(true);
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'granted' }]]);
  });

  it('pushes a denied update on withdrawal', () => {
    const calls: unknown[][] = [];
    (globalThis as GtagGlobals).gtag = (...args) => {
      calls.push(args);
    };
    updateAnalyticsConsent(false);
    expect(calls).toEqual([['consent', 'update', { analytics_storage: 'denied' }]]);
  });

  it('is a no-op when the bootstrap has not run', () => {
    expect(() => updateAnalyticsConsent(true)).not.toThrow();
  });
});

describe('deleteGaCookies', () => {
  it('expires _ga and _ga_* cookies but leaves others', () => {
    document.cookie = '_ga=GA1.1.111';
    document.cookie = '_ga_ABC123=GS1.1.222';
    document.cookie = 'other=keep';
    deleteGaCookies();
    expect(document.cookie).toBe('other=keep');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/consent/gtag.spec.ts`
Expected: FAIL — cannot resolve `@/lib/consent/gtag`.

- [ ] **Step 3: Write the implementation**

`src/lib/consent/gtag.ts` (MPL header first, then):

```ts
/**
 * Consent Mode v2 plumbing for the hard-gated GA setup.
 *
 * CONSENT_MODE_BOOTSTRAP runs as a parse-time inline script in the site
 * layout: it seeds a denied-by-default consent state on the dataLayer and
 * defines the global `gtag` before the GA script could ever load. It must
 * stay a classic `function` inside the string — gtag.js only recognizes
 * commands pushed as `arguments` objects, which arrow functions cannot
 * produce.
 */
export const CONSENT_MODE_BOOTSTRAP =
  'window.dataLayer=window.dataLayer||[];' +
  'function gtag(){dataLayer.push(arguments);}' +
  'window.gtag=gtag;' +
  "gtag('consent','default',{ad_personalization:'denied',ad_storage:'denied',ad_user_data:'denied',analytics_storage:'denied'});";

interface GtagGlobals {
  gtag?: (...args: unknown[]) => void;
}

/**
 * Pushes a Consent Mode v2 update. A no-op when the bootstrap has not run
 * (unit tests, non-browser contexts) — the queue function is the bootstrap's
 * to define.
 */
export const updateAnalyticsConsent = (granted: boolean): void => {
  const { gtag } = globalThis as GtagGlobals;
  gtag?.('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
};

const GA_COOKIE_PATTERN = /^_ga($|_)/;
const COOKIE_EXPIRY = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

/**
 * Best-effort removal of GA's first-party cookies on withdrawal. GA sets
 * them host-wide, so each name is expired against the bare path, the exact
 * hostname, and the dot-prefixed domain.
 */
export const deleteGaCookies = (): void => {
  if (typeof document === 'undefined') {
    return;
  }
  const names = document.cookie
    .split(';')
    .map((pair) => pair.split('=')[0]?.trim() ?? '')
    .filter((name) => GA_COOKIE_PATTERN.test(name));
  const { hostname } = globalThis.location;
  names.forEach((name) => {
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/`;
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/; domain=${hostname}`;
    document.cookie = `${name}=; ${COOKIE_EXPIRY}; path=/; domain=.${hostname}`;
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/consent/gtag.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent/gtag.ts src/lib/consent/gtag.spec.ts
git commit -m 'feat: ✨ add consent mode gtag helpers'
```

---

### Task 3: Cookie/storage inventory

**Files:**
- Create: `src/lib/consent/inventory.ts`
- Test: `src/lib/consent/inventory.spec.ts`

**Interfaces:**
- Consumes: `CONSENT_STORAGE_KEY` from `@/lib/consent/consent-storage`.
- Produces: `type ConsentCategoryId = 'analytics' | 'essential'`, `interface ConsentCategory { description: string; id: ConsentCategoryId; title: string }`, `interface InventoryItem { category: ConsentCategoryId; duration: string; name: string; provider: string; purpose: string; type: 'cookie' | 'local storage' | 'script' }`, `CONSENT_CATEGORIES: readonly ConsentCategory[]`, `CONSENT_INVENTORY: readonly InventoryItem[]`, `inventoryFor(category: ConsentCategoryId): readonly InventoryItem[]`.

- [ ] **Step 1: Write the failing test**

`src/lib/consent/inventory.spec.ts` (MPL header first, then):

```ts
import { CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';
import { CONSENT_CATEGORIES, CONSENT_INVENTORY, inventoryFor } from '@/lib/consent/inventory';

describe('consent inventory', () => {
  it('has at least one item in every category', () => {
    const populated = CONSENT_CATEGORIES.every(
      (category) => inventoryFor(category.id).length > 0
    );
    expect(populated).toBe(true);
  });

  it('has unique item names', () => {
    const names = CONSENT_INVENTORY.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('lists the consent record itself under essential', () => {
    const names = inventoryFor('essential').map((item) => item.name);
    expect(names).toContain(CONSENT_STORAGE_KEY);
  });

  it('lists the GA cookies under analytics', () => {
    const names = inventoryFor('analytics').map((item) => item.name);
    expect(names).toEqual(expect.arrayContaining(['_ga', '_ga_*']));
  });

  it('inventoryFor returns only items of the requested category', () => {
    const offCategory = inventoryFor('analytics').filter(
      (item) => item.category !== 'analytics'
    );
    expect(offCategory).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/consent/inventory.spec.ts`
Expected: FAIL — cannot resolve `@/lib/consent/inventory`.

- [ ] **Step 3: Write the implementation**

`src/lib/consent/inventory.ts` (MPL header first, then):

```ts
import { CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';

export type ConsentCategoryId = 'analytics' | 'essential';

export interface ConsentCategory {
  description: string;
  id: ConsentCategoryId;
  title: string;
}

export interface InventoryItem {
  category: ConsentCategoryId;
  duration: string;
  name: string;
  provider: string;
  purpose: string;
  type: 'cookie' | 'local storage' | 'script';
}

/**
 * Single source of truth for everything the site stores or loads, rendered
 * by both the preferences dialog and the privacy page so the two can never
 * drift.
 */
export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  {
    description:
      'required for the site to work — remembers your cookie decision and theme. always on, never leaves your browser.',
    id: 'essential',
    title: 'essential',
  },
  {
    description:
      'usage statistics that help improve the site. nothing loads or leaves your browser until you allow it.',
    id: 'analytics',
    title: 'analytics',
  },
];

export const CONSENT_INVENTORY: readonly InventoryItem[] = [
  {
    category: 'analytics',
    duration: '2 years',
    name: '_ga',
    provider: 'google analytics',
    purpose: 'distinguishes returning visitors for usage statistics',
    type: 'cookie',
  },
  {
    category: 'analytics',
    duration: '2 years',
    name: '_ga_*',
    provider: 'google analytics',
    purpose: 'keeps session state for this site’s ga4 property',
    type: 'cookie',
  },
  {
    category: 'analytics',
    duration: 'no cookies — aggregate, per visit',
    name: 'vercel analytics',
    provider: 'vercel',
    purpose: 'anonymous, cookieless page metrics',
    type: 'script',
  },
  {
    category: 'essential',
    duration: '12 months',
    name: CONSENT_STORAGE_KEY,
    provider: 'this site',
    purpose: 'remembers your cookie decision',
    type: 'local storage',
  },
  {
    category: 'essential',
    duration: 'until cleared',
    name: 'theme',
    provider: 'this site',
    purpose: 'remembers your light/dark preference',
    type: 'local storage',
  },
];

export const inventoryFor = (category: ConsentCategoryId): readonly InventoryItem[] =>
  CONSENT_INVENTORY.filter((item) => item.category === category);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/consent/inventory.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent/inventory.ts src/lib/consent/inventory.spec.ts
git commit -m 'feat: ✨ add cookie consent inventory'
```

---

### Task 4: Consent provider context

**Files:**
- Create: `src/components/consent/consent-provider.tsx`
- Test: `src/components/consent/consent-provider.spec.tsx`

**Interfaces:**
- Consumes: `readConsent`/`writeConsent` from `@/lib/consent/consent-storage`; `deleteGaCookies`/`updateAnalyticsConsent` from `@/lib/consent/gtag`.
- Produces: `type ConsentStatus = 'decided' | 'loading' | 'undecided'`, `interface ConsentChoices { analytics: boolean }`, `interface ConsentContextValue { analyticsGranted: boolean; closePreferences: () => void; denyAll: () => void; grantAll: () => void; openPreferences: () => void; preferencesOpen: boolean; save: (choices: ConsentChoices) => void; status: ConsentStatus }`, `ConsentProvider({ children })`, `useConsent(): ConsentContextValue`.

Note: `status` starts `'loading'` (nothing renders), becomes `'undecided'` (banner shows) or `'decided'` (trigger shows) after the storage read. Three states — not two — so decided visitors never see a banner flash before hydration completes.

- [ ] **Step 1: Write the failing test**

`src/components/consent/consent-provider.spec.tsx` (MPL header first, then):

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent, writeConsent } from '@/lib/consent/consent-storage';
import { deleteGaCookies, updateAnalyticsConsent } from '@/lib/consent/gtag';

vi.mock('@/lib/consent/gtag', () => ({
  deleteGaCookies: vi.fn(),
  updateAnalyticsConsent: vi.fn(),
}));

const Probe = () => {
  const consent = useConsent();
  return (
    <div>
      <span data-testid="status">{consent.status}</span>
      <span data-testid="analytics">{String(consent.analyticsGranted)}</span>
      <span data-testid="preferences-open">{String(consent.preferencesOpen)}</span>
      <button onClick={consent.grantAll} type="button">
        grant
      </button>
      <button onClick={consent.denyAll} type="button">
        deny
      </button>
      <button onClick={() => consent.save({ analytics: true })} type="button">
        save-on
      </button>
      <button onClick={consent.openPreferences} type="button">
        open
      </button>
      <button onClick={consent.closePreferences} type="button">
        close
      </button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <ConsentProvider>
      <Probe />
    </ConsentProvider>
  );

describe('ConsentProvider', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('hydrates to undecided when nothing is stored', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('undecided');
    });
  });

  it('hydrates to decided/granted from a stored grant', async () => {
    writeConsent(true);
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('analytics')).toHaveTextContent('true');
    });
  });

  it('re-seeds the granted consent signal on hydration', async () => {
    writeConsent(true);
    renderProbe();
    await waitFor(() => {
      expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);
    });
  });

  it('grantAll persists a granted record', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('grantAll pushes a granted consent update', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'grant' }));
    expect(updateAnalyticsConsent).toHaveBeenCalledWith(true);
  });

  it('denyAll persists a declined record', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('denyAll deletes the GA cookies', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(deleteGaCookies).toHaveBeenCalledTimes(1);
  });

  it('save applies the given analytics choice', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'save-on' }));
    expect(screen.getByTestId('analytics')).toHaveTextContent('true');
  });

  it('a decision closes the preferences dialog', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    await userEvent.click(screen.getByRole('button', { name: 'deny' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('false');
  });

  it('openPreferences and closePreferences toggle preferencesOpen', async () => {
    renderProbe();
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('useConsent outside the provider throws', () => {
    const BareProbe = () => {
      useConsent();
      return null;
    };
    expect(() => render(<BareProbe />)).toThrow('useConsent must be used inside <ConsentProvider>');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/consent/consent-provider.spec.tsx`
Expected: FAIL — cannot resolve `@/components/consent/consent-provider`.

- [ ] **Step 3: Write the implementation**

`src/components/consent/consent-provider.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readConsent, writeConsent } from '@/lib/consent/consent-storage';
import { deleteGaCookies, updateAnalyticsConsent } from '@/lib/consent/gtag';

import type { ReactNode } from 'react';

export type ConsentStatus = 'decided' | 'loading' | 'undecided';

export interface ConsentChoices {
  analytics: boolean;
}

export interface ConsentContextValue {
  analyticsGranted: boolean;
  closePreferences: () => void;
  denyAll: () => void;
  grantAll: () => void;
  openPreferences: () => void;
  preferencesOpen: boolean;
  save: (choices: ConsentChoices) => void;
  status: ConsentStatus;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export const useConsent = (): ConsentContextValue => {
  const value = useContext(ConsentContext);
  if (!value) {
    throw new Error('useConsent must be used inside <ConsentProvider>');
  }
  return value;
};

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConsentStatus>('loading');
  const [analyticsGranted, setAnalyticsGranted] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Hydrate from storage after mount: the server render cannot know the
  // decision, and 'loading' keeps banner and trigger unrendered until the
  // stored state has been read — no flash for decided visitors.
  useEffect(() => {
    const record = readConsent();
    if (record === null) {
      setStatus('undecided');
      return;
    }
    if (record.analytics) {
      // Seed the granted signal before the GA tag mounts in the same
      // commit — dataLayer order decides what gtag.js sees at boot.
      updateAnalyticsConsent(true);
    }
    setAnalyticsGranted(record.analytics);
    setStatus('decided');
  }, []);

  const apply = useCallback((analytics: boolean) => {
    updateAnalyticsConsent(analytics);
    if (!analytics) {
      deleteGaCookies();
    }
    writeConsent(analytics);
    setAnalyticsGranted(analytics);
    setStatus('decided');
    setPreferencesOpen(false);
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      analyticsGranted,
      closePreferences: () => setPreferencesOpen(false),
      denyAll: () => apply(false),
      grantAll: () => apply(true),
      openPreferences: () => setPreferencesOpen(true),
      preferencesOpen,
      save: ({ analytics }) => apply(analytics),
      status,
    }),
    [analyticsGranted, apply, preferencesOpen, status]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/consent/consent-provider.spec.tsx`
Expected: PASS (12 tests). (The `useConsent outside provider` test logs a React error boundary message to stderr — that is React's render-throw reporting, not a failure.)

- [ ] **Step 5: Commit**

```bash
git add src/components/consent/consent-provider.tsx src/components/consent/consent-provider.spec.tsx
git commit -m 'feat: ✨ add consent provider context'
```

---

### Task 5: Switch UI primitive

**Files:**
- Create: `src/components/ui/switch.tsx`
- Test: `src/components/ui/switch.spec.tsx`

**Interfaces:**
- Consumes: nothing from this repo.
- Produces: `Switch({ checked, disabled?, label, onCheckedChange }: { checked: boolean; disabled?: boolean; label: string; onCheckedChange: (checked: boolean) => void })` — a native checkbox styled as an ASCII toggle.

- [ ] **Step 1: Write the failing test**

`src/components/ui/switch.spec.tsx` (MPL header first, then):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Switch } from '@/components/ui/switch';

describe('Switch', () => {
  it('exposes an accessible checkbox named by its label', () => {
    render(<Switch checked={false} label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByRole('checkbox', { name: 'analytics' })).not.toBeChecked();
  });

  it('reports the next checked state on click', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} label="analytics" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'analytics' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows the filled glyph when checked', () => {
    render(<Switch checked label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByText('[■]')).toBeInTheDocument();
  });

  it('shows the empty glyph when unchecked', () => {
    render(<Switch checked={false} label="analytics" onCheckedChange={() => undefined} />);
    expect(screen.getByText('[ ]')).toBeInTheDocument();
  });

  it('does not fire when disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked disabled label="always on" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByText('always on'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ui/switch.spec.tsx`
Expected: FAIL — cannot resolve `@/components/ui/switch`.

- [ ] **Step 3: Write the implementation**

`src/components/ui/switch.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

const GLYPH_CLASSES =
  'text-phosphor peer-focus-visible:outline-phosphor font-mono text-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2';

/**
 * A native checkbox styled as an ASCII toggle — accessible by construction
 * (real input, label association, keyboard toggling for free).
 */
export const Switch = ({ checked, disabled = false, label, onCheckedChange }: SwitchProps) => (
  <label
    className={`flex items-center gap-2 font-mono text-sm ${
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    }`}
  >
    <input
      checked={checked}
      className="peer sr-only"
      disabled={disabled}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
    <span aria-hidden="true" className={GLYPH_CLASSES}>
      {checked ? '[■]' : '[ ]'}
    </span>
    {label}
  </label>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/switch.spec.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/switch.tsx src/components/ui/switch.spec.tsx
git commit -m 'feat: ✨ add switch ui primitive'
```

---

### Task 6: Consent banner

**Files:**
- Create: `src/components/consent/consent-banner.tsx`
- Test: `src/components/consent/consent-banner.spec.tsx`

**Interfaces:**
- Consumes: `useConsent` from `@/components/consent/consent-provider`; `writeConsent` (spec only).
- Produces: `ConsentBanner()` — non-modal bottom bar, rendered only while `status === 'undecided'`.

- [ ] **Step 1: Write the failing test**

`src/components/consent/consent-banner.spec.tsx` (MPL header first, then):

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentBanner } from '@/components/consent/consent-banner';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent, writeConsent } from '@/lib/consent/consent-storage';

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

const renderBanner = () =>
  render(
    <ConsentProvider>
      <ConsentBanner />
      <PreferencesProbe />
    </ConsentProvider>
  );

describe('ConsentBanner', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('appears while the visitor is undecided', async () => {
    renderBanner();
    expect(await screen.findByRole('region', { name: 'cookie consent' })).toBeInTheDocument();
  });

  it('stays hidden once a decision exists', async () => {
    writeConsent(false);
    renderBanner();
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'cookie consent' })).not.toBeInTheDocument();
    });
  });

  it('accept all stores a granted decision and hides the banner', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'accept all' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('decline all stores a declined decision', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'decline all' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('customize opens the preferences dialog state', async () => {
    renderBanner();
    await userEvent.click(await screen.findByRole('button', { name: 'customize' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('links to the privacy page', async () => {
    renderBanner();
    expect(await screen.findByRole('link', { name: 'privacy' })).toHaveAttribute(
      'href',
      '/privacy'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/consent/consent-banner.spec.tsx`
Expected: FAIL — cannot resolve `@/components/consent/consent-banner`.

- [ ] **Step 3: Write the implementation**

`src/components/consent/consent-banner.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

import Link from 'next/link';

import { useConsent } from '@/components/consent/consent-provider';

const BANNER_BUTTON_CLASSES =
  'border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-3 py-1.5 font-mono text-xs transition-colors';

/**
 * First-visit consent bar. Non-modal by design — EU guidance forbids
 * consent walls, so the page stays fully usable behind it. All three
 * actions get identical visual weight (no dark patterns).
 */
export const ConsentBanner = () => {
  const { denyAll, grantAll, openPreferences, status } = useConsent();

  if (status !== 'undecided') {
    return null;
  }

  return (
    <section
      aria-label="cookie consent"
      className="border-edge bg-surface fixed inset-x-0 bottom-0 z-40 border-t"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-5 py-4">
        <p className="text-fg-muted font-mono text-xs">
          this site uses cookies for analytics — nothing loads until you decide.{' '}
          <Link className="link-draw text-fg" href="/privacy">
            privacy
          </Link>
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className={BANNER_BUTTON_CLASSES} onClick={grantAll} type="button">
            accept all
          </button>
          <button className={BANNER_BUTTON_CLASSES} onClick={denyAll} type="button">
            decline all
          </button>
          <button className={BANNER_BUTTON_CLASSES} onClick={openPreferences} type="button">
            customize
          </button>
        </div>
      </div>
    </section>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/consent/consent-banner.spec.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/consent/consent-banner.tsx src/components/consent/consent-banner.spec.tsx
git commit -m 'feat: ✨ add cookie consent banner'
```

---

### Task 7: Inventory table + preferences dialog

**Files:**
- Create: `src/components/consent/cookie-inventory-table.tsx`
- Create: `src/components/consent/consent-preferences-dialog.tsx`
- Test: `src/components/consent/cookie-inventory-table.spec.tsx`
- Test: `src/components/consent/consent-preferences-dialog.spec.tsx`

**Interfaces:**
- Consumes: `inventoryFor`, `CONSENT_CATEGORIES`, `ConsentCategoryId` from `@/lib/consent/inventory`; `useConsent`; `Dialog`/`DialogContent`/`DialogTitle` from `@/components/ui/dialog`; `Switch` from `@/components/ui/switch`.
- Produces: `CookieInventoryTable({ category }: { category: ConsentCategoryId })` (server-safe — no `'use client'`, reused by the privacy page); `ConsentPreferencesDialog()` (controlled by `preferencesOpen`).

- [ ] **Step 1: Write the failing tests**

`src/components/consent/cookie-inventory-table.spec.tsx` (MPL header first, then):

```tsx
import { render, screen } from '@testing-library/react';

import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { inventoryFor } from '@/lib/consent/inventory';

describe('CookieInventoryTable', () => {
  it('renders one row per analytics inventory item', () => {
    render(<CookieInventoryTable category="analytics" />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(inventoryFor('analytics').length + 1);
  });

  it('names the GA cookie', () => {
    render(<CookieInventoryTable category="analytics" />);
    expect(screen.getByText('_ga')).toBeInTheDocument();
  });

  it('does not leak items from other categories', () => {
    render(<CookieInventoryTable category="essential" />);
    expect(screen.queryByText('_ga')).not.toBeInTheDocument();
  });
});
```

`src/components/consent/consent-preferences-dialog.spec.tsx` (MPL header first, then):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentPreferencesDialog } from '@/components/consent/consent-preferences-dialog';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { readConsent } from '@/lib/consent/consent-storage';

const OpenProbe = () => {
  const { openPreferences } = useConsent();
  return (
    <button onClick={openPreferences} type="button">
      open-preferences
    </button>
  );
};

const renderDialog = async () => {
  render(
    <ConsentProvider>
      <ConsentPreferencesDialog />
      <OpenProbe />
    </ConsentProvider>
  );
  await userEvent.click(screen.getByRole('button', { name: 'open-preferences' }));
};

describe('ConsentPreferencesDialog', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('opens with an accessible dialog title', async () => {
    await renderDialog();
    expect(screen.getByRole('dialog', { name: 'cookie preferences' })).toBeInTheDocument();
  });

  it('renders the essential toggle as always on and disabled', async () => {
    await renderDialog();
    expect(screen.getByRole('checkbox', { name: 'always on' })).toBeDisabled();
  });

  it('defaults the analytics toggle to off when undecided', async () => {
    await renderDialog();
    expect(screen.getByRole('checkbox', { name: 'off' })).not.toBeChecked();
  });

  it('save preferences persists the toggled analytics choice', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('checkbox', { name: 'off' }));
    await userEvent.click(screen.getByRole('button', { name: 'save preferences' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('accept all persists a grant', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'accept all' }));
    expect(readConsent()?.analytics).toBe(true);
  });

  it('decline all persists a refusal', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'decline all' }));
    expect(readConsent()?.analytics).toBe(false);
  });

  it('a decision closes the dialog', async () => {
    await renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'decline all' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/consent/cookie-inventory-table.spec.tsx src/components/consent/consent-preferences-dialog.spec.tsx`
Expected: FAIL — cannot resolve both new modules.

- [ ] **Step 3: Write the implementations**

`src/components/consent/cookie-inventory-table.tsx` (MPL header first, then — NO `'use client'`; this renders server-side on the privacy page):

```tsx
import { inventoryFor } from '@/lib/consent/inventory';

import type { ConsentCategoryId } from '@/lib/consent/inventory';

const HEADER_CELL_CLASSES = 'px-2 py-1.5 font-normal';
const CELL_CLASSES = 'border-edge border-t px-2 py-1.5 align-top';

export const CookieInventoryTable = ({ category }: { category: ConsentCategoryId }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left font-mono text-xs">
      <caption className="sr-only">{`${category} cookies and storage`}</caption>
      <thead>
        <tr className="text-fg-muted">
          <th className={HEADER_CELL_CLASSES} scope="col">
            name
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            type
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            provider
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            purpose
          </th>
          <th className={HEADER_CELL_CLASSES} scope="col">
            duration
          </th>
        </tr>
      </thead>
      <tbody>
        {inventoryFor(category).map((item) => (
          <tr key={item.name}>
            <td className={CELL_CLASSES}>{item.name}</td>
            <td className={CELL_CLASSES}>{item.type}</td>
            <td className={CELL_CLASSES}>{item.provider}</td>
            <td className={CELL_CLASSES}>{item.purpose}</td>
            <td className={CELL_CLASSES}>{item.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

`src/components/consent/consent-preferences-dialog.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

import { useEffect, useId, useState } from 'react';

import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { useConsent } from '@/components/consent/consent-provider';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { CONSENT_CATEGORIES } from '@/lib/consent/inventory';

const ACTION_BUTTON_CLASSES =
  'border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-3 py-1.5 font-mono text-xs transition-colors';

/** The in-depth consent form: per-category toggles + full inventory. */
export const ConsentPreferencesDialog = () => {
  const { analyticsGranted, closePreferences, denyAll, grantAll, preferencesOpen, save } =
    useConsent();
  const [analyticsPending, setAnalyticsPending] = useState(analyticsGranted);
  const descriptionId = useId();

  // Re-sync the pending toggle each time the dialog opens, so an abandoned
  // change never leaks into the next opening.
  useEffect(() => {
    if (preferencesOpen) {
      setAnalyticsPending(analyticsGranted);
    }
  }, [analyticsGranted, preferencesOpen]);

  return (
    <Dialog onOpenChange={(open) => (open ? undefined : closePreferences())} open={preferencesOpen}>
      <DialogContent
        aria-describedby={descriptionId}
        className="max-h-[85dvh] max-w-lg overflow-y-auto"
      >
        <DialogTitle>cookie preferences</DialogTitle>
        <p className="text-fg-muted mt-2 font-mono text-xs" id={descriptionId}>
          essential storage is always on; everything else stays off until you allow it. every
          cookie and storage entry is listed below.
        </p>
        {CONSENT_CATEGORIES.map((category) => (
          <section aria-label={`${category.title} category`} className="mt-5" key={category.id}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-mono text-sm font-bold">{category.title}</h3>
              {category.id === 'essential' ? (
                <Switch checked disabled label="always on" onCheckedChange={() => undefined} />
              ) : (
                <Switch
                  checked={analyticsPending}
                  label={analyticsPending ? 'on' : 'off'}
                  onCheckedChange={setAnalyticsPending}
                />
              )}
            </div>
            <p className="text-fg-muted mt-1 font-mono text-xs">{category.description}</p>
            <div className="mt-2">
              <CookieInventoryTable category={category.id} />
            </div>
          </section>
        ))}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={ACTION_BUTTON_CLASSES}
            onClick={() => save({ analytics: analyticsPending })}
            type="button"
          >
            save preferences
          </button>
          <button className={ACTION_BUTTON_CLASSES} onClick={grantAll} type="button">
            accept all
          </button>
          <button className={ACTION_BUTTON_CLASSES} onClick={denyAll} type="button">
            decline all
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/consent/cookie-inventory-table.spec.tsx src/components/consent/consent-preferences-dialog.spec.tsx`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/consent/cookie-inventory-table.tsx src/components/consent/cookie-inventory-table.spec.tsx src/components/consent/consent-preferences-dialog.tsx src/components/consent/consent-preferences-dialog.spec.tsx
git commit -m 'feat: ✨ add consent preferences dialog'
```

---

### Task 8: Cursor-block reopen trigger

**Files:**
- Create: `src/components/consent/consent-cursor-trigger.tsx`
- Test: `src/components/consent/consent-cursor-trigger.spec.tsx`

**Interfaces:**
- Consumes: `useConsent`.
- Produces: `ConsentCursorTrigger()` — fixed bottom-left, rendered only when `status === 'decided'`; `aria-label="cookie preferences"`; ≥44px hit area (`h-11`/`min-w-11`); steady phosphor block, `cookies` label on hover/focus.

- [ ] **Step 1: Write the failing test**

`src/components/consent/consent-cursor-trigger.spec.tsx` (MPL header first, then):

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentCursorTrigger } from '@/components/consent/consent-cursor-trigger';
import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { writeConsent } from '@/lib/consent/consent-storage';

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

const renderTrigger = () =>
  render(
    <ConsentProvider>
      <ConsentCursorTrigger />
      <PreferencesProbe />
    </ConsentProvider>
  );

describe('ConsentCursorTrigger', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('is hidden while the visitor is undecided', async () => {
    renderTrigger();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'cookie preferences' })).not.toBeInTheDocument();
    });
  });

  it('appears once a decision exists', async () => {
    writeConsent(false);
    renderTrigger();
    expect(await screen.findByRole('button', { name: 'cookie preferences' })).toBeInTheDocument();
  });

  it('opens the preferences dialog state on click', async () => {
    writeConsent(false);
    renderTrigger();
    await userEvent.click(await screen.findByRole('button', { name: 'cookie preferences' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });

  it('keeps a 44px minimum hit area', async () => {
    writeConsent(true);
    renderTrigger();
    const trigger = await screen.findByRole('button', { name: 'cookie preferences' });
    expect(trigger.className).toContain('h-11');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/consent/consent-cursor-trigger.spec.tsx`
Expected: FAIL — cannot resolve `@/components/consent/consent-cursor-trigger`.

- [ ] **Step 3: Write the implementation**

`src/components/consent/consent-cursor-trigger.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * The always-available way back into cookie preferences: a steady phosphor
 * block — the site's typewriter caret, minus the blink — pinned to the
 * bottom-left corner on every viewport. Visually caret-sized; the button
 * itself keeps a 44px hit area for touch and WCAG target size.
 */
export const ConsentCursorTrigger = () => {
  const { openPreferences, status } = useConsent();

  if (status !== 'decided') {
    return null;
  }

  return (
    <button
      aria-label="cookie preferences"
      className="group fixed bottom-3 left-3 z-40 flex h-11 min-w-11 items-center gap-2 rounded px-3"
      onClick={openPreferences}
      type="button"
    >
      <span aria-hidden="true" className="bg-phosphor h-5 w-2.5" />
      <span className="text-phosphor font-mono text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        cookies
      </span>
    </button>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/consent/consent-cursor-trigger.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/consent/consent-cursor-trigger.tsx src/components/consent/consent-cursor-trigger.spec.tsx
git commit -m 'feat: ✨ add consent cursor trigger'
```

---

### Task 9: Hard-gate all three analytics surfaces

**Files:**
- Modify: `src/components/site/google-analytics-tag.tsx` (whole file below)
- Modify: `src/components/site/google-analytics-tag.spec.tsx` (whole file below)
- Create: `src/components/site/vercel-analytics-tag.tsx`
- Test: `src/components/site/vercel-analytics-tag.spec.tsx`
- Create: `src/components/consent/consent-mode-script.tsx`
- Test: `src/components/consent/consent-mode-script.spec.tsx`
- Modify: `src/lib/analytics.ts` (add consent check)
- Modify: `src/lib/analytics.spec.ts` (whole file below)

**Interfaces:**
- Consumes: `useConsent`, `hasAnalyticsConsent`, `CONSENT_MODE_BOOTSTRAP`, `writeConsent` (specs only).
- Produces: `GoogleAnalyticsTag()` (now consent-aware, `'use client'`), `VercelAnalyticsTag()`, `ConsentModeScript()` (server component), `trackEvent` (unchanged signature, now consent-gated).

> **Warning:** between this task's commit and Task 10's, the running app is broken — `GoogleAnalyticsTag` now calls `useConsent()` but the layout does not yet render `ConsentProvider`. Unit tests stay green (they wrap the provider themselves). Do not `pnpm dev` or build between the two commits; Task 10 restores the tree.

- [ ] **Step 1: Write the failing tests**

Replace `src/components/site/google-analytics-tag.spec.tsx` entirely with (MPL header first, then):

```tsx
import { render, waitFor } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';
import { GoogleAnalyticsTag } from '@/components/site/google-analytics-tag';
import { writeConsent } from '@/lib/consent/consent-storage';

const gaProps = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: Record<string, unknown>) => {
    gaProps.current = props;
    return null;
  },
}));

const renderTag = () =>
  render(
    <ConsentProvider>
      <GoogleAnalyticsTag />
    </ConsentProvider>
  );

describe('GoogleAnalyticsTag', () => {
  afterEach(() => {
    gaProps.current = null;
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset even with consent', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('renders nothing while consent is undecided', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('renders nothing when analytics consent was declined', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(false);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current).toBeNull();
    });
  });

  it('passes the measurement id to the GA script once consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(gaProps.current?.gaId).toBe('G-TEST123');
    });
  });
});
```

Create `src/components/site/vercel-analytics-tag.spec.tsx` (MPL header first, then):

```tsx
import { render, waitFor } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';
import { VercelAnalyticsTag } from '@/components/site/vercel-analytics-tag';
import { writeConsent } from '@/lib/consent/consent-storage';

const analyticsRendered = vi.hoisted(() => ({ current: false }));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => {
    analyticsRendered.current = true;
    return null;
  },
}));

const renderTag = () =>
  render(
    <ConsentProvider>
      <VercelAnalyticsTag />
    </ConsentProvider>
  );

describe('VercelAnalyticsTag', () => {
  afterEach(() => {
    analyticsRendered.current = false;
    localStorage.clear();
  });

  it('renders nothing while consent is undecided', async () => {
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(false);
    });
  });

  it('renders nothing when analytics consent was declined', async () => {
    writeConsent(false);
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(false);
    });
  });

  it('mounts Vercel Analytics once consent is granted', async () => {
    writeConsent(true);
    renderTag();
    await waitFor(() => {
      expect(analyticsRendered.current).toBe(true);
    });
  });
});
```

Create `src/components/consent/consent-mode-script.spec.tsx` (MPL header first, then):

```tsx
import { render } from '@testing-library/react';

import { ConsentModeScript } from '@/components/consent/consent-mode-script';
import { CONSENT_MODE_BOOTSTRAP } from '@/lib/consent/gtag';

describe('ConsentModeScript', () => {
  it('inlines the consent mode bootstrap verbatim', () => {
    const { container } = render(<ConsentModeScript />);
    expect(container.querySelector('script')?.innerHTML).toBe(CONSENT_MODE_BOOTSTRAP);
  });
});
```

Replace `src/lib/analytics.spec.ts` entirely with (MPL header first, then):

```ts
import { sendGAEvent } from '@next/third-parties/google';

import { trackEvent } from '@/lib/analytics';
import { writeConsent } from '@/lib/consent/consent-storage';

vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));

describe('trackEvent', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('forwards the event when GA is configured and consent is granted', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(true);
    trackEvent('request_quote_click', { service: 'ai-enablement' });
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'request_quote_click', {
      service: 'ai-enablement',
    });
  });

  it('does nothing when the measurement id is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', undefined);
    writeConsent(true);
    trackEvent('newsletter_signup', {});
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('drops events while consent is undecided', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    trackEvent('newsletter_signup', {});
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('drops events when analytics consent was declined', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    writeConsent(false);
    trackEvent('cv_download', { format: 'pdf' });
    expect(sendGAEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/site/google-analytics-tag.spec.tsx src/components/site/vercel-analytics-tag.spec.tsx src/components/consent/consent-mode-script.spec.tsx src/lib/analytics.spec.ts`
Expected: FAIL — unresolved new modules; GA tag renders regardless of consent; trackEvent sends without consent.

- [ ] **Step 3: Write the implementations**

Replace `src/components/site/google-analytics-tag.tsx` entirely with (MPL header first, then):

```tsx
'use client';

import { GoogleAnalytics } from '@next/third-parties/google';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * Mounts the GA4 tag only when BOTH gates open: the measurement id exists
 * (production Vercel env only — dev, preview, CI, and E2E never have it)
 * AND the visitor granted analytics consent. Until then zero bytes go to
 * Google. The provider pushes the Consent Mode `granted` update before
 * this mounts, so gtag.js boots with the correct consent state.
 */
export const GoogleAnalyticsTag = () => {
  const { analyticsGranted } = useConsent();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return gaMeasurementId && analyticsGranted ? <GoogleAnalytics gaId={gaMeasurementId} /> : null;
};
```

Create `src/components/site/vercel-analytics-tag.tsx` (MPL header first, then):

```tsx
'use client';

import { Analytics } from '@vercel/analytics/next';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * Vercel Analytics is cookieless, but this site gates it behind the same
 * analytics consent as GA: "analytics: off" means off — nothing loads and
 * nothing is sent for visitors who declined or have not decided.
 */
export const VercelAnalyticsTag = () => {
  const { analyticsGranted } = useConsent();

  return analyticsGranted ? <Analytics /> : null;
};
```

Create `src/components/consent/consent-mode-script.tsx` (MPL header first, then — NO `'use client'`; it must be in the server-rendered HTML so it executes at parse time):

```tsx
import { CONSENT_MODE_BOOTSTRAP } from '@/lib/consent/gtag';

/**
 * Parse-time Consent Mode v2 bootstrap: denies every signal by default and
 * defines the global gtag queue before any analytics script could load.
 * A static, compile-time string — nothing user-controlled is interpolated.
 */
export const ConsentModeScript = () => (
  <script dangerouslySetInnerHTML={{ __html: CONSENT_MODE_BOOTSTRAP }} />
);
```

In `src/lib/analytics.ts`, add the import (after the `sendGAEvent` import) and the consent check. The file becomes (MPL header first, then):

```ts
import { sendGAEvent } from '@next/third-parties/google';

import { hasAnalyticsConsent } from '@/lib/consent/consent-storage';

import type { ContactReason } from '@/lib/validation/contact';

/**
 * Every custom analytics event the site can emit, with its parameters.
 * Adding an event means adding a key here; call sites stay type-checked.
 * Names are snake_case per GA4 convention; `generate_lead` is GA4's
 * recommended event name for lead-form submissions.
 */
interface AnalyticsEventMap {
  cv_download: { format: 'pdf' };
  generate_lead: { reason: ContactReason };
  newsletter_signup: Record<string, never>;
  request_quote_click: { service: string };
}

/**
 * Sends a custom GA4 event. A no-op unless NEXT_PUBLIC_GA_MEASUREMENT_ID is
 * set (production only) AND the visitor granted analytics consent — events
 * fired before a consent decision are dropped by design, not queued.
 */
export const trackEvent = <Name extends keyof AnalyticsEventMap>(
  name: Name,
  params: AnalyticsEventMap[Name]
): void => {
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    return;
  }
  if (!hasAnalyticsConsent()) {
    return;
  }
  sendGAEvent('event', name, params);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/site/google-analytics-tag.spec.tsx src/components/site/vercel-analytics-tag.spec.tsx src/components/consent/consent-mode-script.spec.tsx src/lib/analytics.spec.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/site/google-analytics-tag.tsx src/components/site/google-analytics-tag.spec.tsx src/components/site/vercel-analytics-tag.tsx src/components/site/vercel-analytics-tag.spec.tsx src/components/consent/consent-mode-script.tsx src/components/consent/consent-mode-script.spec.tsx src/lib/analytics.ts src/lib/analytics.spec.ts
git commit -m 'feat: ✨ hard-gate analytics on consent'
```

---

### Task 10: Wire consent into the site layout + footer

**Files:**
- Modify: `src/app/(site)/layout.tsx`
- Modify: `src/components/site/site-footer.tsx`
- Modify: `src/components/site/site-footer.spec.tsx` (add tests)

**Interfaces:**
- Consumes: everything produced in Tasks 4–9.
- Produces: the wired tree — `ConsentProvider` inside `ThemeProvider`; `ConsentBanner`/`ConsentPreferencesDialog`/`ConsentCursorTrigger` beside `PaletteMount`; `VercelAnalyticsTag`/`GoogleAnalyticsTag` inside the provider; `ConsentModeScript` at the end of `<body>`; footer `privacy` link + `pb-16`.

- [ ] **Step 1: Write the failing footer tests**

Append inside the existing `describe` in `src/components/site/site-footer.spec.tsx` (read the file first; match its render/assert style):

```tsx
  it('links to the privacy page', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacy');
  });

  it('reserves bottom padding for the consent cursor trigger', () => {
    const { container } = render(<SiteFooter />);
    expect(container.querySelector('.pb-16')).not.toBeNull();
  });
```

If the existing spec imports differ (e.g. no `screen`), adapt the imports, not the assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/site/site-footer.spec.tsx`
Expected: FAIL — no `privacy` link, no `.pb-16`.

- [ ] **Step 3: Modify the footer**

In `src/components/site/site-footer.tsx`:

1. Change the inner div's class from `px-5 py-6` to `px-5 pt-6 pb-16` (rest of the class list unchanged):

```tsx
    <div className="text-fg-muted mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-5 pt-6 pb-16 font-mono text-xs">
```

2. Add a `privacy` item after the `rss` `<li>`:

```tsx
        <li>
          <Link className="link-draw hover:text-fg" href="/privacy">
            privacy
          </Link>
        </li>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/site/site-footer.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Wire the layout**

In `src/app/(site)/layout.tsx`:

1. Replace the import `import { Analytics } from '@vercel/analytics/next';` with:

```tsx
import { ConsentBanner } from '@/components/consent/consent-banner';
import { ConsentCursorTrigger } from '@/components/consent/consent-cursor-trigger';
import { ConsentModeScript } from '@/components/consent/consent-mode-script';
import { ConsentPreferencesDialog } from '@/components/consent/consent-preferences-dialog';
import { ConsentProvider } from '@/components/consent/consent-provider';
import { VercelAnalyticsTag } from '@/components/site/vercel-analytics-tag';
```

(keep all other imports; `GoogleAnalyticsTag` stays; perfectionist will fix ordering via `pnpm exec eslint --fix src/app/\(site\)/layout.tsx`).

2. Replace the body of `RootLayout`'s `<SerwistRegister>`…`</body>` region so the tree becomes:

```tsx
        <SerwistRegister>
          <ThemeProvider>
            <ConsentProvider>
              <div className="flex min-h-dvh flex-col">
                <SiteNav />
                {/* tabIndex={-1}: older Safari won't move sequential focus past
                    the skip link's target unless it is programmatically
                    focusable. */}
                <main className="flex-1" id="main" tabIndex={-1}>
                  {children}
                </main>
                <SiteFooter />
              </div>
              <PaletteMount />
              <ThemeColorSync />
              <ConsentBanner />
              <ConsentPreferencesDialog />
              <ConsentCursorTrigger />
              <VercelAnalyticsTag />
              <GoogleAnalyticsTag />
            </ConsentProvider>
          </ThemeProvider>
          <script
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
            type="application/ld+json"
          />
        </SerwistRegister>
        <ConsentModeScript />
      </body>
```

(The old `<Analytics />` and the old standalone `<GoogleAnalyticsTag />` at the end of `<body>` are removed — both now live inside the provider.)

- [ ] **Step 6: Verify the whole suite and build still pass**

Run: `pnpm exec vitest run`
Expected: PASS — all suites, no regressions.

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(site)/layout.tsx' src/components/site/site-footer.tsx src/components/site/site-footer.spec.tsx
git commit -m 'feat: ✨ wire consent into site layout'
```

---

### Task 11: Privacy page

**Files:**
- Create: `src/components/consent/manage-cookie-preferences.tsx`
- Test: `src/components/consent/manage-cookie-preferences.spec.tsx`
- Create: `src/app/(site)/privacy/page.tsx`
- Test: `src/app/(site)/privacy/page.spec.tsx`
- Modify: `src/app/sitemap.ts` (add `/privacy`)

**Interfaces:**
- Consumes: `useConsent`, `CookieInventoryTable`, `CONSENT_CATEGORIES`, `siteConfig`.
- Produces: `ManageCookiePreferences()` (client button opening the dialog); `/privacy` route (server component, `export default function PrivacyPage()`).

- [ ] **Step 1: Write the failing tests**

`src/components/consent/manage-cookie-preferences.spec.tsx` (MPL header first, then):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConsentProvider, useConsent } from '@/components/consent/consent-provider';
import { ManageCookiePreferences } from '@/components/consent/manage-cookie-preferences';

const PreferencesProbe = () => {
  const { preferencesOpen } = useConsent();
  return <span data-testid="preferences-open">{String(preferencesOpen)}</span>;
};

describe('ManageCookiePreferences', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('opens the preferences dialog state', async () => {
    render(
      <ConsentProvider>
        <ManageCookiePreferences />
        <PreferencesProbe />
      </ConsentProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'manage cookie preferences' }));
    expect(screen.getByTestId('preferences-open')).toHaveTextContent('true');
  });
});
```

`src/app/(site)/privacy/page.spec.tsx` (MPL header first, then):

```tsx
import { render, screen } from '@testing-library/react';

import { ConsentProvider } from '@/components/consent/consent-provider';

import PrivacyPage, { metadata } from './page';

const renderPage = () =>
  render(
    <ConsentProvider>
      <PrivacyPage />
    </ConsentProvider>
  );

describe('PrivacyPage', () => {
  it('titles itself privacy', () => {
    expect(metadata.title).toBe('privacy');
  });

  it('names the controller', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: /who/ })).toBeInTheDocument();
  });

  it('links to google’s privacy policy', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /google privacy policy/ })).toHaveAttribute(
      'href',
      'https://policies.google.com/privacy'
    );
  });

  it('links to google’s partner-sites disclosure', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /how google uses partner data/ })).toHaveAttribute(
      'href',
      'https://policies.google.com/technologies/partner-sites'
    );
  });

  it('links to cloudflare’s privacy policy', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /cloudflare privacy policy/ })).toHaveAttribute(
      'href',
      'https://www.cloudflare.com/privacypolicy/'
    );
  });

  it('states the 14-month analytics retention', () => {
    renderPage();
    expect(screen.getByText(/14 months/)).toBeInTheDocument();
  });

  it('offers the manage-preferences button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: 'manage cookie preferences' })
    ).toBeInTheDocument();
  });

  it('renders the analytics inventory', () => {
    renderPage();
    expect(screen.getByText('_ga')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/consent/manage-cookie-preferences.spec.tsx 'src/app/(site)/privacy/page.spec.tsx'`
Expected: FAIL — unresolved modules.

- [ ] **Step 3: Write the implementations**

`src/components/consent/manage-cookie-preferences.tsx` (MPL header first, then `'use client';`, then):

```tsx
'use client';

import { useConsent } from '@/components/consent/consent-provider';

export const ManageCookiePreferences = () => {
  const { openPreferences } = useConsent();

  return (
    <button
      className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-4 py-2 font-mono text-sm transition-colors"
      onClick={openPreferences}
      type="button"
    >
      manage cookie preferences
    </button>
  );
};
```

`src/app/(site)/privacy/page.tsx` (MPL header first, then):

```tsx
import Link from 'next/link';

import { CookieInventoryTable } from '@/components/consent/cookie-inventory-table';
import { ManageCookiePreferences } from '@/components/consent/manage-cookie-preferences';
import { CONSENT_CATEGORIES } from '@/lib/consent/inventory';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  description:
    'What this site measures, who receives it, how long it is kept, and the choices you keep.',
  title: 'privacy',
};

const H2_CLASSES = 'text-phosphor mt-10 font-mono text-lg font-bold';
const BODY_CLASSES = 'text-fg mt-3 max-w-2xl leading-relaxed';
const LIST_CLASSES = 'text-fg mt-3 max-w-2xl list-disc space-y-2 pl-6 leading-relaxed';

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="text-fg-muted font-mono text-sm">
        <span aria-hidden="true" className="text-phosphor">
          $
        </span>{' '}
        cat ./privacy.md
      </p>
      <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
        <span aria-hidden="true"># </span>privacy
      </h1>
      <p className="text-fg-muted mt-3 max-w-2xl leading-relaxed">
        What this site measures, who receives it, and the choices you keep. Last updated
        2026-08-01.
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>who
      </h2>
      <p className={BODY_CLASSES}>
        Michaux Kelley runs this site and is the data controller. For any question or request
        about your data, use the{' '}
        <Link className="link-draw text-phosphor" href="/contact">
          contact form
        </Link>
        .
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>what &amp; why
      </h2>
      <ul className={LIST_CLASSES}>
        <li>
          <strong>analytics</strong> — Google Analytics 4 (pages visited, referrers, rough
          geography; GA4 drops IP addresses at collection) and Vercel Analytics (cookieless,
          aggregate page metrics). Legal basis: consent. Neither loads until you allow it in
          the cookie form.
        </li>
        <li>
          <strong>contact form</strong> — name, email, and message, emailed to me so I can
          respond. Legal basis: taking steps prior to entering a contract.
        </li>
        <li>
          <strong>newsletter</strong> — your email plus double-opt-in confirmation and
          unsubscribe tokens, stored in the site database. Legal basis: consent; unsubscribing
          withdraws it.
        </li>
        <li>
          <strong>bot protection</strong> — Cloudflare Turnstile on the contact form processes
          IP and browser signals to keep bots out. Legal basis: legitimate interest in site
          security.
        </li>
      </ul>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>who receives it
      </h2>
      <p className={BODY_CLASSES}>
        Google LLC (analytics), Vercel Inc. (hosting and analytics), Cloudflare Inc. (bot
        protection), and an email delivery provider (contact and newsletter mail). Transfers to
        the US rely on the EU-US Data Privacy Framework. See the{' '}
        <a
          className="link-draw text-phosphor"
          href="https://policies.google.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >
          google privacy policy
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        ,{' '}
        <a
          className="link-draw text-phosphor"
          href="https://policies.google.com/technologies/partner-sites"
          rel="noopener noreferrer"
          target="_blank"
        >
          how google uses partner data
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        , and the{' '}
        <a
          className="link-draw text-phosphor"
          href="https://www.cloudflare.com/privacypolicy/"
          rel="noopener noreferrer"
          target="_blank"
        >
          cloudflare privacy policy
          <span className="sr-only"> (opens in new tab)</span>
        </a>
        .
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>cookies &amp; storage
      </h2>
      <p className={BODY_CLASSES}>
        Analytics never runs before you allow it. Change your mind anytime — with the button
        below or the phosphor block pinned to the bottom-left corner of every page.
      </p>
      {CONSENT_CATEGORIES.map((category) => (
        <section className="mt-6" key={category.id}>
          <h3 className="font-mono text-sm font-bold">{category.title}</h3>
          <div className="mt-2 max-w-2xl">
            <CookieInventoryTable category={category.id} />
          </div>
        </section>
      ))}
      <div className="mt-6">
        <ManageCookiePreferences />
      </div>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>retention
      </h2>
      <p className={BODY_CLASSES}>
        Analytics event data is kept for 14 months, then deleted. Contact messages are kept
        only as long as needed to handle them. Newsletter data is kept until you unsubscribe.
      </p>

      <h2 className={H2_CLASSES}>
        <span aria-hidden="true">## </span>your rights
      </h2>
      <ul className={LIST_CLASSES}>
        <li>withdraw consent at any time — it is as easy as giving it.</li>
        <li>ask for access to, correction of, or erasure of your data.</li>
        <li>lodge a complaint with your local supervisory authority.</li>
      </ul>
    </div>
  );
}
```

In `src/app/sitemap.ts`, add the privacy entry after the contact line:

```ts
    { url: `${siteConfig.url}/contact` },
    { url: `${siteConfig.url}/privacy` },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/consent/manage-cookie-preferences.spec.tsx 'src/app/(site)/privacy/page.spec.tsx'`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/consent/manage-cookie-preferences.tsx src/components/consent/manage-cookie-preferences.spec.tsx 'src/app/(site)/privacy/page.tsx' 'src/app/(site)/privacy/page.spec.tsx' src/app/sitemap.ts
git commit -m 'feat: ✨ add privacy page'
```

---

### Task 12: E2E coverage

**Read `e2e/AGENTS.md` in full before this task.** The suite runs only via `pnpm e2e`; never point it at a server you did not spawn; the env is hermetic (no GA measurement id, so the GA script never loads in E2E — the banner and Vercel gating are what these tests exercise).

**Files:**
- Create: `e2e/consent-helpers.ts`
- Create: `e2e/consent.spec.ts`
- Modify: `e2e/contact.spec.ts`, `e2e/newsletter.spec.ts`, `e2e/palette.spec.ts`, `e2e/theme.spec.ts` (pre-seed consent so existing flows never meet the banner)

**Interfaces:**
- Consumes: `CONSENT_STORAGE_KEY`, `CONSENT_VERSION` from `../src/lib/consent/consent-storage` (relative import — e2e sits outside the `@/*` alias root).
- Produces: `seedDecidedConsent(page: Page): Promise<void>`.

- [ ] **Step 1: Write the helper**

`e2e/consent-helpers.ts` (MPL header first, then):

```ts
import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from '../src/lib/consent/consent-storage';

import type { Page } from '@playwright/test';

/**
 * Seeds a decided, declined consent record before any page script runs, so
 * flows under test never meet the banner and never load analytics.
 */
export const seedDecidedConsent = async (page: Page): Promise<void> => {
  const value = JSON.stringify({
    analytics: false,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  });
  await page.addInitScript(
    ({ key, record }: { key: string; record: string }) => {
      window.localStorage.setItem(key, record);
    },
    { key: CONSENT_STORAGE_KEY, record: value }
  );
};
```

- [ ] **Step 2: Pre-seed the four existing specs**

In each of `e2e/contact.spec.ts`, `e2e/newsletter.spec.ts`, `e2e/palette.spec.ts`, `e2e/theme.spec.ts`, add below the existing imports:

```ts
import { seedDecidedConsent } from './consent-helpers';

test.beforeEach(async ({ page }) => {
  await seedDecidedConsent(page);
});
```

If a spec already has a `test.beforeEach`, add the `seedDecidedConsent(page)` call as its first line instead of adding a second block.

- [ ] **Step 3: Write the consent E2E spec**

`e2e/consent.spec.ts` (MPL header first, then):

```ts
import { expect, test } from '@playwright/test';

import { CONSENT_STORAGE_KEY } from '../src/lib/consent/consent-storage';
import { seedDecidedConsent } from './consent-helpers';

test('banner gates analytics until a custom save decision', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'cookie consent' });
  await expect(banner).toBeVisible();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(0);

  await banner.getByRole('button', { name: 'customize' }).click();
  const dialog = page.getByRole('dialog', { name: 'cookie preferences' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'off' }).check();
  await dialog.getByRole('button', { name: 'save preferences' }).click();
  await expect(banner).toBeHidden();

  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    CONSENT_STORAGE_KEY
  );
  expect(JSON.parse(stored ?? '{}')).toMatchObject({ analytics: true, version: 1 });
});

test('accepting all mounts vercel analytics', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'accept all' }).click();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(1);
});

test('the corner trigger reopens preferences after a decision', async ({ page }) => {
  await seedDecidedConsent(page);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'cookie consent' })).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'cookie preferences' });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'cookie preferences' })).toBeVisible();
});

test('declining keeps analytics unloaded and shows the privacy page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'decline all' }).click();
  await expect(page.locator('script[src*="_vercel/insights"]')).toHaveCount(0);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: /privacy/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'manage cookie preferences' })).toBeVisible();
});
```

Note: if the `_vercel/insights` script assertion proves flaky under `next start` (the Vercel Analytics loader can defer injection), switch the assertion to `await page.waitForFunction(() => typeof (window as { va?: unknown }).va !== 'undefined')` for presence and its inverse for absence — but try the script-count form first; it is the simpler evidence.

- [ ] **Step 4: Run the E2E suite**

Run: `pnpm e2e`
Expected: PASS — the four pre-existing specs (unchanged behavior, banner pre-seeded away) plus 4 new consent tests.

- [ ] **Step 5: Commit**

```bash
git add e2e/consent-helpers.ts e2e/consent.spec.ts e2e/contact.spec.ts e2e/newsletter.spec.ts e2e/palette.spec.ts e2e/theme.spec.ts
git commit -m 'test: ✅ cover consent in e2e flows'
```

---

### Task 13: Full gate + spec conformance check

**Files:** none new.

- [ ] **Step 1: Run the full gate**

Run: `pnpm run gate`
Expected: format check, typecheck, lint, and coverage-checked suite all green. Evidence is the counted output (`Test Files N passed`), never just the exit banner.

- [ ] **Step 2: Check the plan against the spec**

Re-read `docs/superpowers/specs/2026-08-01-privacy-cookie-consent-design.md` and confirm each spec requirement maps to shipped code: hard gate (GA + Vercel), banner in every environment, equal-prominence actions, in-depth dialog with inventory, cursor trigger on all viewports with ≥44px target, Art. 13-complete privacy page (whole-site), footer link + padding, sitemap entry, 12-month expiry, versioned record, drop-not-queue events, no consent logging.

- [ ] **Step 3: Fix anything found, re-run `pnpm run gate`, commit fixes**

Use accurate conventional types for any fix commits (e.g. `fix: 🐛 …`, `test: ✅ …`).
