import type { Metadata } from 'next';

import { unsubscribeSubscriber } from '@/lib/repositories/subscribers';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'unsubscribe',
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const unsubscribed = token ? await unsubscribeSubscriber(token) : false;
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-20">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> ./unsubscribe
      </p>
      {unsubscribed ? (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # unsubscribed
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            done — no more email from here. resubscribe anytime if you change
            your mind.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            # invalid token
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">
            this unsubscribe link is invalid — reply to any newsletter email
            and I&apos;ll remove you by hand.
          </p>
        </>
      )}
    </div>
  );
}
