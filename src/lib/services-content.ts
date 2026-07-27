/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export interface ServiceContent {
  credibility: string;
  deliverables: string[];
  name: string;
  pitch: string;
  slug: string;
}

/** Canonical service list: seed source and empty-DB fallback. Order matters. */
export const SERVICES: ServiceContent[] = [
  {
    credibility:
      'Early participant in the Windsurf/Cascade pilot that drove company-wide adoption at Centene; presented Copilot, prompt engineering, and MCP servers to hundreds of developers and leadership.',
    deliverables: [
      'Tooling pilots and rollout: Claude Code, GitHub Copilot, Windsurf',
      'MCP server integration wired to your actual systems (docs, design, data)',
      'Prompt & context engineering playbooks for your codebase',
      'Hands-on workshops and pairing sessions',
      'An adoption report with metrics your leadership can read',
    ],
    name: 'AI engineering enablement',
    pitch:
      'Your team has Copilot licenses and a mandate. Turning that into shipped software is the hard part. I run the adoption end-to-end: tool selection and pilots, MCP server integration, prompt and context engineering, and the training that makes it stick.',
    slug: 'ai-enablement',
  },
  {
    credibility:
      'Founding engineer of Boudreaux, an MPL 2.0 open-source music marketplace; senior engineer on healthcare platforms serving multiple lines of business at Centene.',
    deliverables: [
      'Greenfield product builds, from architecture to deploy',
      'Marketplace and payment flows (Stripe & Stripe Connect)',
      'AWS infrastructure: EC2, S3, CloudFront, Lambda, SES',
      'CI/CD pipelines with disciplined testing baked in',
      'Documentation and handoff your team can run with',
    ],
    name: 'Full-stack product development',
    pitch:
      'End-to-end builds in the stack I ship daily: React 19, Next.js App Router, TypeScript, Node.js, MongoDB, and AWS. From greenfield to launch — including payments, media delivery, and the unglamorous infrastructure in between.',
    slug: 'product-dev',
  },
  {
    credibility:
      "Brought custom React components across Centene's lines of business to WCAG 2.1 Level AA, verified with macOS VoiceOver and Lighthouse.",
    deliverables: [
      'Full WCAG 2.1 AA audit with prioritized findings',
      'Remediation in your components and design system',
      'VoiceOver and Lighthouse verification passes',
      'Accessible patterns documented for your team',
      'Regression guardrails in CI',
    ],
    name: 'Accessibility audits & fixes',
    pitch:
      'WCAG 2.1 AA is a legal floor and a usability win — and most React codebases fail it in the same dozen ways. I audit, fix, and verify with real assistive technology, then teach your team the patterns so it stays fixed.',
    slug: 'accessibility',
  },
  {
    credibility:
      'Raised coverage from ~60% to 90–95% across all metrics at Centene; 6,000+ Vitest tests running in under 12 seconds on Boudreaux.',
    deliverables: [
      'Lighthouse and runtime performance audits with fixes',
      'Test-coverage rescue: Vitest, React Testing Library, Playwright',
      'CI pipeline hygiene: caching, pre-commit hooks, flake hunting',
      'Coverage gates that hold (90%+ across metrics)',
      'A performance budget your team can enforce',
    ],
    name: 'Performance & testing uplift',
    pitch:
      'Slow pages and flaky suites compound daily. I profile, fix, and leave behind fast builds, honest coverage, and CI that catches regressions before your users do.',
    slug: 'performance',
  },
  {
    credibility:
      'Mentored and paired with junior engineers on React, TypeScript, Next.js, and responsible AI tooling across multiple enterprise teams.',
    deliverables: [
      'Recurring 1:1 pairing and mentoring sessions',
      'Code review standards and culture that outlast me',
      'AI-assisted development mentorship for juniors and seniors',
      'Interview and career-growth guidance',
      'A mentoring cadence report for engineering leadership',
    ],
    name: 'Team mentoring',
    pitch:
      'Leveling up engineers is the highest-leverage work I do. Pairing, code review culture, and honest feedback — including how to use AI tooling responsibly instead of leaning on it.',
    slug: 'mentoring',
  },
];
