import { TerminalSection } from '@/components/home/terminal-section';
import { NewsletterForm } from '@/components/newsletter/newsletter-form';

export function NewsletterBeat() {
  return (
    <TerminalSection command="subscribe --newsletter">
      <p className="max-w-2xl leading-relaxed text-fg-muted">
        new posts, straight to your inbox. no spam, no schedule, unsubscribe
        anytime.
      </p>
      <div className="mt-5">
        <NewsletterForm />
      </div>
    </TerminalSection>
  );
}
