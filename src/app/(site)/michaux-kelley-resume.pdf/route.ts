/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { getSiteSettings } from '@/lib/repositories/site-settings';
import { RESUME_PATH } from '@/lib/site-config';

/** The name a download gets, whatever the owner's upload was called. */
const DOWNLOAD_NAME = RESUME_PATH.slice(1);

const NOT_UPLOADED = 404;
const STORAGE_FAILED = 502;
const SETTINGS_UNAVAILABLE = 503;

/** Five minutes, the same window the pages revalidate on. */
const CACHE_CONTROL = 'public, max-age=300';

/**
 * The Resume's permanent address. It serves whatever the owner last uploaded
 * in Site settings, so a link to this address from anywhere keeps working
 * when the file is replaced. With no upload there is nothing here: 404.
 *
 * The upload's own address belongs to storage and changes with every upload,
 * so the file is fetched from there and passed through rather than
 * redirected to.
 */
export async function GET(request: Request): Promise<Response> {
  let resumeUrl: null | string;
  try {
    ({ resumeUrl } = await getSiteSettings());
  } catch (error) {
    // The repository does not catch (docs/adr/0001), and this handler runs
    // per request, so the failure has to be answered here.
    console.error('resume: the Site settings could not be read:', error);
    return new Response('The Resume is temporarily unavailable.', {
      status: SETTINGS_UNAVAILABLE,
    });
  }
  if (resumeUrl === null) {
    return new Response('No Resume is available.', { status: NOT_UPLOADED });
  }

  try {
    // Relative when Payload serves the file itself, absolute when storage does.
    const upload = await fetch(new URL(resumeUrl, request.url));
    if (!upload.ok) {
      console.error(`resume: storage answered ${upload.status} for the current upload`);
      return new Response('The Resume could not be loaded.', { status: STORAGE_FAILED });
    }
    return new Response(upload.body, {
      headers: {
        'Cache-Control': CACHE_CONTROL,
        'Content-Disposition': `inline; filename="${DOWNLOAD_NAME}"`,
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error) {
    console.error('resume: storage could not be reached:', error);
    return new Response('The Resume could not be loaded.', { status: STORAGE_FAILED });
  }
}
