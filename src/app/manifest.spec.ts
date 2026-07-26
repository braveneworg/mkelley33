import manifest from '@/app/manifest';

describe('manifest', () => {
  it('is installable: name, start_url, display, and both icon sizes', () => {
    const result = manifest();
    expect(result.name).toBe('mkelley33');
    expect(result.start_url).toBe('/');
    expect(result.display).toBe('standalone');
    const sizes = (result.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });
});
