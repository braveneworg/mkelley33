/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPayload } from 'payload';

import config from '@payload-config';

import { safePreviewPath } from '@/lib/pages/preview';

const BAD_REQUEST = 400;
const FORBIDDEN = 403;

const refuse = (status: number): Response =>
  new Response('You are not allowed to preview this page.', { status });

/**
 * Where the admin's Preview button lands. It switches Next's draft mode on
 * and sends the owner to the page, which then shows the newest saved state
 * instead of the published one.
 *
 * Draft mode is what lets a request see unpublished work, so this is the
 * only place it is switched on, and only for someone signed in to the
 * admin: the request carries the admin's own cookie, and Payload checks it.
 * No shared preview secret is involved — a link alone opens nothing.
 */
export async function GET(request: Request): Promise<Response> {
  const path = safePreviewPath(new URL(request.url).searchParams.get('path'));
  if (path === null) {
    return refuse(BAD_REQUEST);
  }

  const draft = await draftMode();
  try {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: request.headers });
    if (!user) {
      draft.disable();
      return refuse(FORBIDDEN);
    }
  } catch (error) {
    console.error('preview: the sign-in could not be checked:', error);
    draft.disable();
    return refuse(FORBIDDEN);
  }

  draft.enable();
  redirect(path);
}
