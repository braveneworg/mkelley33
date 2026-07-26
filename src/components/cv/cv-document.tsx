import { BUTTON_LINK_CLASSES } from '@/components/ui/button-link';
import {
  CV_EDUCATION,
  CV_EXPERIENCE,
  CV_OPEN_SOURCE,
  CV_SKILLS,
  CV_SUMMARY,
} from '@/lib/cv-content';
import { siteConfig } from '@/lib/site-config';

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-phosphor mt-10 font-mono text-lg font-bold print:text-black">
    <span aria-hidden="true"># </span>
    {children}
  </h2>
);

export const CvDocument = ({ resumePdf = siteConfig.resumePdf }: { resumePdf?: string | null }) => (
  <article className="cv-document mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
    <p className="text-fg-muted font-mono text-sm print:hidden">
      <span aria-hidden="true" className="text-phosphor">
        $
      </span>{' '}
      cat ./cv.md
    </p>
    <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">{siteConfig.name}</h1>
    <p className="text-fg-muted mt-2 font-mono text-sm">
      Wake Forest, NC · me@mkelley33.com · mkelley33.com · linkedin.com/in/mkelley33 ·
      github.com/mkelley33
    </p>
    {resumePdf ? (
      <a className={`${BUTTON_LINK_CLASSES} mt-5 print:hidden`} download href={resumePdf}>
        Download PDF ↓
      </a>
    ) : null}

    <SectionHeading>Professional summary</SectionHeading>
    <p className="text-fg mt-3 leading-relaxed">{CV_SUMMARY}</p>

    <SectionHeading>Technical skills</SectionHeading>
    <dl className="mt-3 space-y-3">
      {CV_SKILLS.map((group) => (
        <div key={group.label}>
          <dt className="text-fg font-mono text-sm font-bold">{group.label}</dt>
          <dd className="text-fg-muted mt-1 text-sm leading-relaxed">{group.items}</dd>
        </div>
      ))}
    </dl>

    <SectionHeading>Professional experience</SectionHeading>
    <ol className="mt-3 space-y-8">
      {CV_EXPERIENCE.map((entry) => (
        <li key={entry.hash}>
          <h3 className="text-fg font-mono text-base font-bold">{entry.role}</h3>
          <p className="text-fg-muted mt-1 font-mono text-sm">
            {entry.org} · {entry.location} · {entry.start}–{entry.end}
          </p>
          <ul className="text-fg mt-3 space-y-2 text-sm leading-relaxed">
            {entry.bullets.map((bullet) => (
              <li className="flex gap-2" key={bullet}>
                <span aria-hidden="true" className="text-phosphor print:text-black">
                  ▸
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>

    <SectionHeading>Education</SectionHeading>
    <ul className="mt-3 space-y-3">
      {CV_EDUCATION.map((item) => (
        <li key={item.title}>
          <p className="text-fg text-sm font-bold">{item.title}</p>
          <p className="text-fg-muted text-sm">{item.detail}</p>
        </li>
      ))}
    </ul>

    <SectionHeading>Open source &amp; writing</SectionHeading>
    <ul className="mt-3 space-y-2">
      {CV_OPEN_SOURCE.map((item) => (
        <li className="text-fg text-sm leading-relaxed" key={item}>
          {item}
        </li>
      ))}
    </ul>
  </article>
);
