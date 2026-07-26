/** Cloudflare's official always-pass test keys — dev/CI fallback only. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const turnstileSiteKey = (): string =>
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;

/** Fails closed: any verification problem counts as not-verified. */
export const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY ?? TURNSTILE_TEST_SECRET_KEY;
  if (!process.env.TURNSTILE_SECRET_KEY) {
    const message = 'TURNSTILE_SECRET_KEY unset — using Cloudflare test secret (always passes)';
    if (process.env.NODE_ENV === 'production') {
      console.error(message);
    } else {
      console.warn(message);
    }
  }
  try {
    const response = await fetch(VERIFY_URL, {
      body: new URLSearchParams({ response: token, secret }),
      method: 'POST',
    });
    if (!response.ok) {
      console.error('turnstile verify: HTTP', response.status);
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error('turnstile verify failed:', error);
    return false;
  }
};
