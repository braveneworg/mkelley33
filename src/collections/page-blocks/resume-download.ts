/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { Block } from 'payload';

/**
 * The button that downloads the Resume. It has nothing to type: the file is
 * the one in Site settings, and with none there the button is not shown.
 */
export const ResumeDownloadBlock: Block = {
  slug: 'resumeDownload',
  fields: [],
  interfaceName: 'ResumeDownloadBlock',
  labels: { plural: 'Resume downloads', singular: 'Resume download' },
};
