/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useState } from 'react';

export const CopyButton = ({ code }: { code: string }) => {
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
      className="text-fg-muted hover:text-phosphor font-mono text-xs transition-colors"
      onClick={() => void copy()}
      type="button"
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  );
};
