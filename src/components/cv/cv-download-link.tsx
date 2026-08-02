/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { BUTTON_LINK_CLASSES } from '@/components/ui/button-link';
import { trackEvent } from '@/lib/analytics';

export const CvDownloadLink = ({ resumePdf }: { resumePdf: string }) => (
  <a
    className={`${BUTTON_LINK_CLASSES} mt-5 print:hidden`}
    download
    href={resumePdf}
    onClick={() => trackEvent('cv_download', { format: 'pdf' })}
  >
    Download PDF ↓
  </a>
);
