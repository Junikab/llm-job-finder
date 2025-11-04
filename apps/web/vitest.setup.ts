import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// JSDOM lacks IndexedDB; mock global indexedDB if needed by tests
if (!(globalThis as any).indexedDB) {
  (globalThis as any).indexedDB = {} as any;
}

// JSDOM lacks window.scrollTo; stub to avoid Not implemented errors in tests
if (!(globalThis as any).scrollTo) {
  (globalThis as any).scrollTo = vi.fn();
}
