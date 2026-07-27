/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { codeToHtml } from 'shiki';

const THEMES = { dark: 'github-dark-default', light: 'github-light-default' };

export const highlightCode = async (code: string, language: string): Promise<string> => {
  try {
    return await codeToHtml(code, {
      defaultColor: 'light',
      lang: language,
      themes: THEMES,
    });
  } catch {
    return codeToHtml(code, {
      defaultColor: 'light',
      lang: 'text',
      themes: THEMES,
    });
  }
};
