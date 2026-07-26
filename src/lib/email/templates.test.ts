import {
  contactNotificationEmail,
  newsletterConfirmEmail,
} from '@/lib/email/templates';

describe('email templates', () => {
  it('renders the contact notification with reason label and services', () => {
    const email = contactNotificationEmail({
      email: 'ada@example.com',
      message: 'Ship it.',
      name: 'Ada',
      reason: 'services',
      serviceNames: ['AI enablement'],
    });
    expect(email.subject).toBe('[mkelley33.com] request services — Ada');
    expect(email.text).toContain('Ada <ada@example.com>');
    expect(email.text).toContain('AI enablement');
    expect(email.text).toContain('Ship it.');
  });

  it('omits the services line when none were requested', () => {
    const email = contactNotificationEmail({
      email: 'a@b.com',
      message: 'hello there world',
      name: 'B',
      reason: 'general',
      serviceNames: [],
    });
    expect(email.text).not.toContain('services:');
  });

  it('renders the confirm email around the url', () => {
    const email = newsletterConfirmEmail('https://x.test/confirm?token=abc');
    expect(email.subject).toContain('confirm');
    expect(email.text).toContain('https://x.test/confirm?token=abc');
  });
});
