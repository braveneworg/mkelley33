import { render, screen } from '@testing-library/react';

import { AboutBeat } from '@/components/home/about-beat';

describe('AboutBeat', () => {
  it('renders the bio and interests line', () => {
    render(<AboutBeat headshotSrc={null} />);
    expect(screen.getByText('cat ./about.md')).toBeInTheDocument();
    expect(screen.getByText(/10\+ years shipping production React/)).toBeInTheDocument();
    expect(screen.getByText(/music, meditation/)).toBeInTheDocument();
  });

  it('renders a placeholder while the headshot is pending', () => {
    render(<AboutBeat headshotSrc={null} />);
    expect(screen.getByText('# headshot: pending')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the headshot image when supplied', () => {
    render(<AboutBeat headshotSrc="/headshot.jpg" />);
    expect(
      screen.getByRole('img', { name: 'Michaux Kelley' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('# headshot: pending')).not.toBeInTheDocument();
  });
});
