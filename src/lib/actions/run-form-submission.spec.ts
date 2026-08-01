/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { z } from 'zod';

import { runFormSubmission, TURNSTILE_FAILED_ERROR } from '@/lib/actions/run-form-submission';
import { verifyTurnstileToken } from '@/lib/turnstile';

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstileToken: vi.fn(),
}));

/**
 * A stand-in for the real form schemas: `website` is the honeypot and must
 * parse only when empty, so a filled honeypot that still reaches the parser
 * would fail — which is what makes the ordering assertions meaningful.
 */
const schema = z.object({
  email: z.email(),
  turnstileToken: z.string().min(1),
  website: z.literal(''),
});

type TestValues = z.infer<typeof schema>;

interface Persisted {
  id: string;
}

const INVALID_INPUT_ERROR = 'check the fields and retry';
const FAILURE_ERROR = 'something broke — retry in a bit';

const persist = vi.fn<(values: TestValues) => Promise<Persisted>>();
const notify = vi.fn<(values: TestValues, persisted: Persisted) => Promise<void>>();

const valid = { email: 'ada@example.com', turnstileToken: 'tok', website: '' };

const run = (input: unknown) =>
  runFormSubmission({
    failureError: FAILURE_ERROR,
    input,
    invalidInputError: INVALID_INPUT_ERROR,
    label: 'testSubmission',
    notify,
    persist,
    schema,
  });

beforeEach(() => {
  vi.mocked(verifyTurnstileToken).mockResolvedValue(true);
  persist.mockResolvedValue({ id: 'p1' });
  notify.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('runFormSubmission', () => {
  it('persists, notifies, and succeeds on the happy path', async () => {
    await expect(run(valid)).resolves.toEqual({ success: true });
    expect(persist).toHaveBeenCalledWith(valid);
    expect(notify).toHaveBeenCalledWith(valid, { id: 'p1' });
  });

  it('accepts a filled honeypot without parsing or persisting', async () => {
    await expect(run({ ...valid, email: 'not-an-email', website: 'spam' })).resolves.toEqual({
      success: true,
    });
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('rejects invalid input with the supplied message', async () => {
    await expect(run({ ...valid, email: 'nope' })).resolves.toEqual({
      error: INVALID_INPUT_ERROR,
      success: false,
    });
  });

  it('does not verify the token for input that failed to parse', async () => {
    await run({ ...valid, email: 'nope' });
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it('treats a non-object input as an ordinary failed parse', async () => {
    await expect(run('not-a-submission')).resolves.toEqual({
      error: INVALID_INPUT_ERROR,
      success: false,
    });
  });

  it('treats null as an ordinary failed parse', async () => {
    await expect(run(null)).resolves.toEqual({
      error: INVALID_INPUT_ERROR,
      success: false,
    });
  });

  it('treats a missing honeypot field as an ordinary failed parse', async () => {
    await expect(run({ email: 'ada@example.com', turnstileToken: 'tok' })).resolves.toEqual({
      error: INVALID_INPUT_ERROR,
      success: false,
    });
  });

  it('rejects an unverified token', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    await expect(run(valid)).resolves.toEqual({
      error: TURNSTILE_FAILED_ERROR,
      success: false,
    });
  });

  it('does not persist when verification fails', async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(false);
    await run(valid);
    expect(persist).not.toHaveBeenCalled();
  });

  it('verifies the token that survived parsing', async () => {
    await run(valid);
    expect(verifyTurnstileToken).toHaveBeenCalledWith('tok');
  });

  it('still succeeds when notification fails', async () => {
    notify.mockRejectedValue(new Error('smtp down'));
    await expect(run(valid)).resolves.toEqual({ success: true });
  });

  it('logs a failed notification against the label', async () => {
    notify.mockRejectedValue(new Error('smtp down'));
    await run(valid);
    expect(console.error).toHaveBeenCalledWith(
      'testSubmission notification failed:',
      expect.any(Error)
    );
  });

  it('fails with the supplied message when persistence throws', async () => {
    persist.mockRejectedValue(new Error('db down'));
    await expect(run(valid)).resolves.toEqual({
      error: FAILURE_ERROR,
      success: false,
    });
  });

  it('logs a failed submission against the label', async () => {
    persist.mockRejectedValue(new Error('db down'));
    await run(valid);
    expect(console.error).toHaveBeenCalledWith('testSubmission failed:', expect.any(Error));
  });

  it('does not notify when persistence throws', async () => {
    persist.mockRejectedValue(new Error('db down'));
    await run(valid);
    expect(notify).not.toHaveBeenCalled();
  });
});
