import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// This setup file runs for every test file, including `@vitest-environment
// node` integration tests where `window` does not exist — guard the jsdom-only
// setup so it is skipped outside a DOM environment.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
    writable: true,
  });
}
