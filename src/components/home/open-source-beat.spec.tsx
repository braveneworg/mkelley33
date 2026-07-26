import { render, screen } from '@testing-library/react';

import { OpenSourceBeat } from '@/components/home/open-source-beat';

describe('OpenSourceBeat', () => {
  it('renders this site, boudreaux, and contributions entries', () => {
    render(<OpenSourceBeat />);
    expect(screen.getByText('ls ./open-source')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /this-site\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/mkelley33'
    );
    expect(screen.getByRole('link', { name: /boudreaux\// })).toHaveAttribute(
      'href',
      'https://github.com/braveneworg/boudreaux'
    );
    expect(screen.getByText(/react-starter-kit/)).toBeInTheDocument();
    expect(screen.getByText(/mean\.io/)).toBeInTheDocument();
  });
});
