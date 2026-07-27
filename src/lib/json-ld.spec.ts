/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { serializeJsonLd } from '@/lib/json-ld';

describe('serializeJsonLd', () => {
  it('round-trips a plain object via JSON.parse', () => {
    const obj = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Test post',
      url: 'https://example.com/post',
    };
    const serialized = serializeJsonLd(obj);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(obj);
  });

  it('does not emit </script substring when escaping attacks', () => {
    const dangerous = {
      headline: '</script><script>alert(1)</script>',
    };
    const serialized = serializeJsonLd(dangerous);
    expect(serialized).not.toContain('</script');
  });

  it('preserves original string values after JSON.parse (escaping is JSON-transparent)', () => {
    const obj = {
      headline: '</script><script>alert(1)</script>',
    };
    const serialized = serializeJsonLd(obj);
    const parsed = JSON.parse(serialized);
    expect(parsed.headline).toBe('</script><script>alert(1)</script>');
  });
});
