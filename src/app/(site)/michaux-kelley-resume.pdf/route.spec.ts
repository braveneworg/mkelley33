/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// @vitest-environment node

import { makeSiteSettings } from '@/test/make-site-settings';

import { GET } from './route';

const getSiteSettings = vi.fn();

vi.mock('@/lib/repositories/site-settings', () => ({
  getSiteSettings: () => getSiteSettings(),
}));

const fetchMock = vi.fn();

const request = new Request('https://mkelley33.com/michaux-kelley-resume.pdf');

beforeEach(() => {
  getSiteSettings.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /michaux-kelley-resume.pdf', () => {
  describe('with a Resume uploaded', () => {
    beforeEach(() => {
      getSiteSettings.mockResolvedValue(
        makeSiteSettings({ resumeUrl: '/api/resume-files/file/resume-v2.pdf' })
      );
      fetchMock.mockResolvedValue(new Response('%PDF-1.7', { status: 200 }));
    });

    it('serves the current upload', async () => {
      const response = await GET(request);

      await expect(response.text()).resolves.toBe('%PDF-1.7');
    });

    /** The upload's own address is relative; it is fetched from this deployment. */
    it('fetches the upload from the site it is running on', async () => {
      await GET(request);

      expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
        'https://mkelley33.com/api/resume-files/file/resume-v2.pdf'
      );
    });

    it('serves it as a PDF', async () => {
      const response = await GET(request);

      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    /** Whatever the upload was called, the download keeps the permanent name. */
    it('names the download after the permanent address', async () => {
      const response = await GET(request);

      expect(response.headers.get('Content-Disposition')).toBe(
        'inline; filename="michaux-kelley-resume.pdf"'
      );
    });

    it('answers 200', async () => {
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  /** An empty slot is the owner's choice, and the address then has nothing behind it. */
  it('answers 404 when no Resume is uploaded', async () => {
    getSiteSettings.mockResolvedValue(makeSiteSettings({ resumeUrl: null }));

    const response = await GET(request);

    expect(response.status).toBe(404);
  });

  it('does not reach for storage when no Resume is uploaded', async () => {
    getSiteSettings.mockResolvedValue(makeSiteSettings({ resumeUrl: null }));

    await GET(request);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * The route is rendered on request, so nothing upstream turns a thrown
   * failure into a page: it has to answer for it itself.
   */
  it('answers 503 when the Site settings cannot be read', async () => {
    getSiteSettings.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET(request);

    expect(response.status).toBe(503);
  });

  it('answers 502 when storage does not return the file', async () => {
    getSiteSettings.mockResolvedValue(makeSiteSettings());
    fetchMock.mockResolvedValue(new Response('gone', { status: 404 }));

    const response = await GET(request);

    expect(response.status).toBe(502);
  });

  it('answers 502 when storage cannot be reached', async () => {
    getSiteSettings.mockResolvedValue(makeSiteSettings());
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    const response = await GET(request);

    expect(response.status).toBe(502);
  });
});
