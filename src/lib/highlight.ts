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
