export function TerminalSection({
  children,
  command,
}: {
  children: React.ReactNode;
  command: string;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
      <p className="font-mono text-sm text-fg-muted">
        <span className="text-phosphor">$</span> {command}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
