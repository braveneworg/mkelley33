/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BlockSection } from '@/components/blocks/block-section';
import { CvDownloadLink } from '@/components/cv/cv-download-link';
import { getSiteSettings } from '@/lib/repositories/site-settings';
import { RESUME_PATH } from '@/lib/site-config';

/**
 * The button that downloads the Resume from its permanent address. With no
 * Resume in Site settings there is nothing to download, and no button.
 */
export const ResumeDownload = async () => {
  const { resumeUrl } = await getSiteSettings();
  if (resumeUrl === null) {
    return null;
  }
  return (
    <BlockSection>
      <CvDownloadLink resumePdf={RESUME_PATH} />
    </BlockSection>
  );
};
