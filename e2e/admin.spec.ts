/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { expect, test } from '@playwright/test';

import { E2E_OWNER } from '@/lib/e2e/harness-config';

const SIGN_IN_REFUSED = /security check failed/i;

// The Payload admin is where `next`, `payload` and the generated import map
// meet, and nothing else in the suite loads it. Both production admin
// outages on record answered HTTP 200 with a tree that never rendered
// (docs/lessons/deploy/env-gated-plugin-stale-import-map.md), so a status
// check proves nothing — the form has to actually be on the page.
test('payload admin renders its entry form', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/admin');

  // The harness seeds one account, so the admin opens on its sign-in screen.
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByLabel(/email/i)).toBeVisible();
  expect(pageErrors).toEqual([]);
});

// The sign-in screen is this repo's, not Payload's: it carries the Turnstile
// challenge inside Payload's form. This is the only test that shows the
// token leaving the browser in the shape the server reads.
test('signs the owner in once the security check is passed', async ({ context, page }) => {
  await page.goto('/admin/login');
  await page.getByLabel(/email/i).fill(E2E_OWNER.email);
  await page.getByLabel(/password/i).fill(E2E_OWNER.password);
  // The Turnstile test key solves itself; the button opens when it has.
  const signIn = page.getByRole('button', { name: 'Login' });
  await expect(signIn).toBeEnabled({ timeout: 20_000 });

  await signIn.click();

  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
  const cookies = await context.cookies();
  expect(cookies.map(({ name }) => name)).toContain('payload-token');
});

// The right email and the right password, sent the way a script would send
// them: straight to the endpoint, with no challenge passed.
test('refuses the right password sent without the security check', async ({ request }) => {
  const response = await request.post('/api/users/login', { data: E2E_OWNER });

  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).toMatch(SIGN_IN_REFUSED);
  expect(response.headers()['set-cookie']).toBeUndefined();
});

test('refuses a sign-in over GraphQL, which has nowhere to carry the check', async ({
  request,
}) => {
  const response = await request.post('/api/graphql', {
    data: {
      query:
        'mutation ($email: String!, $password: String) { loginUser(email: $email, password: $password) { token } }',
      variables: E2E_OWNER,
    },
  });
  const reply = JSON.stringify(await response.json());

  expect(reply).toMatch(SIGN_IN_REFUSED);
  expect(reply).not.toContain('"token"');
  expect(response.headers()['set-cookie']).toBeUndefined();
});
