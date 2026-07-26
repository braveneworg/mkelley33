import { render, screen } from '@testing-library/react';

import { CareerBeat } from '@/components/home/career-beat';
import { CV_EXPERIENCE } from '@/lib/cv-content';

describe('CareerBeat', () => {
  it('renders one commit line per experience entry', () => {
    render(<CareerBeat />);
    expect(screen.getByText('git log --career')).toBeInTheDocument();
    for (const entry of CV_EXPERIENCE) {
      expect(screen.getByText(entry.hash)).toBeInTheDocument();
      expect(
        screen.getByText(`${entry.role} — ${entry.org}`),
      ).toBeInTheDocument();
    }
  });

  it('links to the full cv', () => {
    render(<CareerBeat />);
    expect(
      screen.getByRole('link', { name: /full history: \.\/cv/i }),
    ).toHaveAttribute('href', '/cv');
  });
});
