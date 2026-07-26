'use client';

import { useState } from 'react';

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — stay quiet.
    }
  };

  return (
    <button
      aria-label="Copy code"
      className="font-mono text-xs text-fg-muted transition-colors hover:text-phosphor"
      onClick={() => void copy()}
      type="button"
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  );
}
