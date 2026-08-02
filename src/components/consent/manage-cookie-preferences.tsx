/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use client';

import { useConsent } from '@/components/consent/consent-provider';

export const ManageCookiePreferences = () => {
  const { openPreferences } = useConsent();

  return (
    <button
      className="border-phosphor text-phosphor hover:bg-phosphor hover:text-canvas rounded border px-4 py-2 font-mono text-sm transition-colors"
      onClick={openPreferences}
      type="button"
    >
      manage cookie preferences
    </button>
  );
};
