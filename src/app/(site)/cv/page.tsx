import type { Metadata } from 'next';

import { CvDocument } from '@/components/cv/cv-document';

export const metadata: Metadata = {
  description:
    'CV of Michaux Kelley — senior full-stack engineer: React, Next.js, TypeScript, Node.js, AWS, and AI-assisted development.',
  title: 'cv',
};

export default function CvPage() {
  return <CvDocument />;
}
