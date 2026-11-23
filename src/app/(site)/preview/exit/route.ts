/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { safePreviewPath } from '@/lib/pages/preview';

/**
 * Leaves the preview: draft mode off, and back to the page as visitors see
 * it. Anyone may call this — switching draft mode off reveals nothing.
 */
export async function GET(request: Request): Promise<Response> {
  const draft = await draftMode();
  draft.disable();
  redirect(safePreviewPath(new URL(request.url).searchParams.get('path')) ?? '/');
}
