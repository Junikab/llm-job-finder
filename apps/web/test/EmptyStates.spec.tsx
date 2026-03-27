import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { App } from '../src/App';

// Mock idb helpers to avoid IndexedDB in JSDOM
vi.mock('../src/idb', () => ({
  listCVs: vi.fn().mockResolvedValue([]),
  saveCV: vi.fn().mockResolvedValue(1),
  getCVFile: vi.fn().mockResolvedValue(null),
  removeCV: vi.fn().mockResolvedValue(undefined),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  (window as any).scrollTo = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch as any;
});

describe('Empty states', () => {
  it('shows Live empty message when results are empty after search', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/jobs/find')) {
        return new Response(
          JSON.stringify({ analysis: { summary: 'x' }, results: [], searchUrls: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ) as any;
      }
      if (url.includes('/api/profiles')) {
        return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
      }
      return new Response('not found', { status: 404 }) as any;
    }) as any;

    render(<App />);

    const liveBtn = screen.getAllByRole('button', { name: /^Live$/i })[0];
    await userEvent.click(liveBtn);

    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/CV \(PDF\/DOCX\/TXT\)/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const anyCheckbox = screen.getByLabelText(/Any \(no location filter\)/i);
    await userEvent.click(anyCheckbox);

    const submit = screen.getByRole('button', { name: /Find Jobs/i });
    await userEvent.click(submit);

    expect(await screen.findByText('No results yet. Try adjusting location or upload a different CV.')).toBeInTheDocument();
  });

  it('shows Saved empty state when nothing is tracked and API returns no items', async () => {
    // ensure localStorage is clear
    localStorage.clear();

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/db/jobs')) {
        return new Response(JSON.stringify({ total: 0, results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
      }
      if (url.includes('/api/profiles')) {
        return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
      }
      return new Response('not found', { status: 404 }) as any;
    }) as any;

    render(<App />);

    const savedBtn = screen.getAllByRole('button', { name: /^Saved$/i })[0];
    await userEvent.click(savedBtn);

    expect(await screen.findByText('No saved jobs yet.')).toBeInTheDocument();
    // Scope to main saved page to avoid collisions
    const savedMain = screen.getByRole('main');
    const btns = within(savedMain).getAllByRole('button', { name: /Find jobs/i });
    expect(btns.length).toBeGreaterThan(0);
  });
});
