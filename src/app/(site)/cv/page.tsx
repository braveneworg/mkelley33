/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvDocument } from '@/components/cv/cv-document';
import { getSiteSettings } from '@/lib/repositories/site-settings';
import { RESUME_PATH } from '@/lib/site-config';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  description:
    'CV of Michaux Kelley — senior full-stack engineer: React, Next.js, TypeScript, Node.js, AWS, and AI-assisted development.',
  title: 'cv',
};

export default async function CvPage() {
  const { name, resumeUrl } = await getSiteSettings();
  return <CvDocument name={name} resumePdf={resumeUrl === null ? null : RESUME_PATH} />;
}
