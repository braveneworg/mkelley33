import { TerminalSection } from '@/components/home/terminal-section';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';

export const NewsletterBeat = () => (
  <TerminalSection command="subscribe --newsletter">
    <p className="text-fg-muted max-w-2xl leading-relaxed">
      new posts, straight to your inbox. no spam, no schedule, unsubscribe anytime.
    </p>
    <div className="mt-5">
      <NewsletterForm />
    </div>
  </TerminalSection>
);
