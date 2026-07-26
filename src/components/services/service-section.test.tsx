import { render, screen } from '@testing-library/react';

import { ServiceSection } from '@/components/services/service-section';
import { SERVICES } from '@/lib/services-content';

const service = SERVICES[0];

describe('ServiceSection', () => {
  it('anchors on the slug and renders name, pitch, credibility', () => {
    const { container } = render(<ServiceSection service={service} />);
    expect(container.querySelector('#ai-enablement')).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: /ai-enablement\// }),
    ).toBeInTheDocument();
    expect(screen.getByText(service.pitch)).toBeInTheDocument();
    expect(screen.getByText(service.credibility)).toBeInTheDocument();
  });

  it('lists every deliverable and links the quote CTA with the slug', () => {
    render(<ServiceSection service={service} />);
    for (const deliverable of service.deliverables) {
      expect(screen.getByText(deliverable)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('link', { name: /request a quote/i }),
    ).toHaveAttribute('href', '/contact?reason=services&service=ai-enablement');
  });
});
