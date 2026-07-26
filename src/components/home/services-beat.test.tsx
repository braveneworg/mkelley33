import { render, screen } from '@testing-library/react';

import { ServicesBeat } from '@/components/home/services-beat';
import { SERVICES } from '@/lib/services-content';

describe('ServicesBeat', () => {
  it('renders a card per service linking to its anchor', () => {
    render(<ServicesBeat />);
    expect(screen.getByText('ls ./services')).toBeInTheDocument();
    for (const service of SERVICES) {
      expect(
        screen.getByRole('link', { name: new RegExp(`${service.slug}/`) }),
      ).toHaveAttribute('href', `/services#${service.slug}`);
    }
  });
});
