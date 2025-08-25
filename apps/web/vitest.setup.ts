import '@testing-library/jest-dom/vitest';

// JSDOM lacks IndexedDB; mock global indexedDB if needed by tests
if (!(globalThis as any).indexedDB) {
  (globalThis as any).indexedDB = {} as any;
}
