import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Michaux Kelley — Full-Stack AI Forward Deployed Engineer',
  description:
    'Production React, Next.js, and Node.js engineering — and AI-assisted development, deployed forward into teams.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
