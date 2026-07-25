import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-20 font-mono sm:py-28">
      <p className="text-sm text-fg-muted">$ open requested-page</p>
      <h1 className="mt-4 text-2xl font-bold">
        zsh: command not found <span className="text-phosphor">(404)</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
        The page you were looking for doesn&apos;t exist — it may have been
        moved, renamed, or never committed.
      </p>
      <p className="mt-8 text-sm">
        <Link
          className="text-phosphor underline underline-offset-4"
          href="/"
        >
          cd ~
        </Link>
      </p>
    </section>
  );
}
