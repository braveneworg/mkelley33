/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CvDocument } from '@/components/cv/cv-document';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  description:
    'CV of Michaux Kelley — senior full-stack engineer: React, Next.js, TypeScript, Node.js, AWS, and AI-assisted development.',
  title: 'cv',
};

export default function CvPage() {
  return <CvDocument />;
}
