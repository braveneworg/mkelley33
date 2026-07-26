export interface CvExperience {
  bullets: string[];
  end: string;
  hash: string;
  location: string;
  org: string;
  role: string;
  start: string;
}

export const CV_SUMMARY =
  'Senior full-stack software engineer with 10+ years building production React, Redux, Next.js, and TypeScript applications for enterprise healthcare, security, retail, and marketplace platforms. Specializes in performant, accessible (WCAG 2.1 AA) UI at scale, Node.js service design, AWS cloud architecture, and disciplined testing practices that routinely exceed 90% coverage. Actively integrates AI-assisted development workflows — GitHub Copilot, Claude Code, MCP servers, prompt and context engineering — to accelerate delivery, raise code quality, and mentor engineering teams.';

export const CV_SKILLS: { items: string; label: string }[] = [
  {
    items: 'TypeScript, JavaScript (ES2022+), HTML5, CSS3, Python, Bash',
    label: 'Languages',
  },
  {
    items:
      'React 19, Next.js (App Router, Server Actions), Tailwind CSS, shadcn/ui, Material UI, Redux Toolkit, Zustand, React Hook Form, Zod, Framer Motion, responsive design, accessibility (WCAG 2.1 AA)',
    label: 'Frontend',
  },
  {
    items:
      'Node.js, Next.js API routes, Server Actions, Express, Django, Auth.js v5, RESTful API design, OpenAPI/Swagger, Stripe & Stripe Connect, Prisma ORM, MongoDB Atlas',
    label: 'Backend',
  },
  {
    items:
      'AWS EC2, S3, CloudFront, Lambda, API Gateway, Route 53, SES, SAM; Docker; Vercel; CI/CD with GitHub Actions and Husky hooks',
    label: 'Cloud & infrastructure',
  },
  {
    items:
      'Vitest, Jest, React Testing Library, Playwright, Cypress, Storybook; integration and E2E test design; coverage and performance profiling',
    label: 'Testing',
  },
  {
    items:
      'Claude Code, GitHub Copilot, Windsurf/Cascade, custom skills (superpowers, mattpocock), MCP servers (Context7, SequentialThinking, Figma, Markitdown, Memory, chrome-devtools), prompt and context engineering, Spec-kit',
    label: 'AI-assisted development',
  },
];

export const CV_EXPERIENCE: CvExperience[] = [
  {
    bullets: [
      'Deliver responsive single-page applications and shared UI libraries in React 19, Zustand, Node.js 24, and Next.js supporting premium payments, claims retrieval, and claims historical data across multiple healthcare lines of business.',
      'Led a company-wide remediation for recent critical React, Next.js, and Node.js CVEs after escalating the vulnerabilities to leadership; coordinated migration of React 18 applications to current versions across Centene projects.',
      "Raised automated test coverage from ~60% to 90–95% across all metrics (exceeding Centene's 80% standard) by introducing Vitest, identifying long-running tests with AI-assisted analysis, and closing coverage gaps.",
      'Built AWS Lambda handlers in Backend-For-Frontend repositories for Node.js microservices; documented and designed APIs using the OpenAPI Specification and Swagger.',
      'Improved accessibility and localization across all lines of business to WCAG 2.1 Level AA in custom React components using the enterprise design system; verified with macOS VoiceOver and Google Lighthouse.',
      'Selected as an early participant in the Windsurf (Cascade + MCP) pilot that drove company-wide adoption; integrated SequentialThinking, Context7, Figma, Markitdown, Memory, and chrome-devtools MCP servers into planning, audit, and implementation workflows.',
      'Presented GitHub Copilot, prompt and context engineering, and MCP servers to hundreds of developers and leadership; authored knowledge-base articles on technical debt and AI-assisted engineering patterns.',
      'Standardized developer workflows by creating Git pre-commit and pre-push Husky hooks for owned projects, saving several developer-hours and hundreds of CI build minutes per week.',
      'Mentored and paired with junior engineers on React, TypeScript, Next.js, and responsible AI tooling usage.',
    ],
    end: 'present',
    hash: 'a7f3e21',
    location: 'Remote',
    org: 'TEKsystems at Centene Corporation',
    role: 'Senior Application Development Engineer (Contract)',
    start: '2025',
  },
  {
    bullets: [
      'Architect and build an MPL 2.0 open-source music marketplace platform (github.com/braveneworg/boudreaux, fakefourrecords.com) for an independent record label, supporting streaming music and video, downloads, purchases, and paid subscription tiers.',
      'Stack: Next.js App Router, React 19, TypeScript, Tailwind CSS, Prisma ORM, MongoDB Atlas, Auth.js v5, Stripe Connect (marketplace payouts), and AWS SES transactional email.',
      'Infrastructure: Dockerized Next.js on AWS EC2, with S3 and signed CloudFront URLs for audio delivery, Route 53 DNS, and AWS Lambda (SAM-deployed) handling Stripe webhook processing with idempotency and raw-body signature verification.',
      'Built a custom React audio player from scratch — transport controls, seekbar, playlist drawer, shuffle/repeat, keyboard shortcuts, Media Session API.',
      'Authored 6,000+ Vitest unit tests at 90%+ coverage across all metrics, executing in under 12 seconds; added Playwright end-to-end suites for critical purchase and playback flows.',
      'Share Zod schemas, TypeScript types, and Server Action contracts across front and back end; React Hook Form and Zod for all form validation.',
    ],
    end: 'present',
    hash: 'b9d4c88',
    location: 'Remote',
    org: 'Boudreaux / Fake Four Records — Brave New Org',
    role: 'Founding Engineer (Open-Source)',
    start: '2025',
  },
  {
    bullets: [
      "Scaffolded and architected the next generation of Limbik's flagship disinformation-mitigation application using Vite, MUI, Zustand, React Hook Form, and Zod.",
      'Delivered Next.js React components for filtering by demographic attributes and routing results through cognitive AI models to measure messaging resonance.',
      'Built organization and user settings components in TypeScript with Material UI; collaborated on secure, performant RESTful APIs with backend engineers.',
    ],
    end: '2025',
    hash: 'c2e8f19',
    location: 'Remote',
    org: 'Limbik',
    role: 'Senior React Developer',
    start: '2025',
  },
  {
    bullets: [
      'Developed responsive web applications in React, Redux, TypeScript, and Next.js — dashboards, reports, infographics, and sales tools.',
      'Designed and consumed RESTful APIs with backend engineers; secured PII with Web Crypto APIs; maintained an internal custom React component library.',
      'Managed application state with Redux Toolkit and Redux Persist; authored WCAG-compliant accessible components.',
      'Created a Next.js seed template adopted as the baseline for future company React projects.',
    ],
    end: '2024',
    hash: 'd5a1b37',
    location: 'Remote',
    org: 'TEKsystems at Ameritas',
    role: 'Senior React Developer (Contract)',
    start: '2023',
  },
  {
    bullets: [
      'Built a responsive self-checkout system in React, Redux, MobX, and TypeScript targeting both mobile web and Electron, with custom MUI-based components designed in Figma.',
      'Owned state and workflow orchestration with Redux Toolkit and Context API; tuned performance with React DevTools.',
      'Added a loyalty and rewards subsystem granting real-time discounts and points during checkout.',
      'Wrote unit, integration, and E2E tests with Jest, React Testing Library, and Cypress.',
    ],
    end: '2023',
    hash: 'e8c6d94',
    location: 'Remote',
    org: 'NCR Voyix (via Optomi)',
    role: 'React Developer',
    start: '2020',
  },
  {
    bullets: [
      'Integrated React components into the Ruby on Rails application that gated every Cisco software release for vulnerability and licensing compliance.',
      'Rebuilt UI, reports, and forms with designers and backend engineers; improved page load performance using Lighthouse and React DevTools.',
    ],
    end: '2020',
    hash: 'f1b9a52',
    location: 'RTP, NC',
    org: 'Aerotek / EASi at Cisco',
    role: 'Senior React Engineer (Contract)',
    start: '2019',
  },
  {
    bullets: [
      'Shipped features and bug fixes for the flagship transportation management system in React and ES6; supported clients and backend teams on cross-application issues.',
    ],
    end: '2019',
    hash: 'a4d7e63',
    location: 'Cary, NC',
    org: 'MercuryGate International',
    role: 'Senior Software Engineer',
    start: '2018',
  },
  {
    bullets: [
      'Senior React Developer at MetaMetrics; Senior Front-End Engineer at Distil Networks (now Imperva); Senior Software Engineer at PointSource; Senior Front-End Developer at BCBSNC. Delivered React, Vue, AngularJS, Backbone.js, and Django applications; authored design systems and style guides.',
    ],
    end: '2018',
    hash: 'b6f2c15',
    location: 'NC',
    org: 'MetaMetrics · Distil Networks · PointSource · BCBSNC',
    role: 'Earlier experience',
    start: '2014',
  },
];

export const CV_EDUCATION: { detail: string; title: string }[] = [
  {
    detail: 'East Carolina University, Greenville, NC — 2010',
    title: "Master's-level coursework in Software Engineering",
  },
  {
    detail: 'University of North Carolina Greensboro — 2005',
    title: 'B.A. in Spanish, minor in Business',
  },
];

export const CV_OPEN_SOURCE: string[] = [
  'Boudreaux / Fake Four Records — founding engineer, MPL 2.0 open-source music marketplace (github.com/braveneworg/boudreaux).',
  'Contributor to react-starter-kit (kriasoft) and mean.io (linnovate).',
  'Technical writing at mkelley33.com — Next.js, tsx REPL, reCAPTCHA with Formik.',
];
