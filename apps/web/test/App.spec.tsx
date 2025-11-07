import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

// Mock idb helpers to avoid IndexedDB in JSDOM
vi.mock('../src/idb', () => ({
  listCVs: vi.fn().mockResolvedValue([]),
  saveCV: vi.fn().mockResolvedValue(1),
  getCVFile: vi.fn().mockResolvedValue(null),
  removeCV: vi.fn().mockResolvedValue(undefined),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/jobs/find')) {
      return new Response(
        JSON.stringify({
          analysis: { summary: 'x', titles: ['Engineer'], topSkills: ['TS'] },
          searchUrls: ['https://jora.example?q=Engineer'],
          results: [
            { id: 'id1', title: 'Role A', company: 'X', location: 'Sydney', url: 'https://example/a', listedAgo: '1 day ago', description: '...', score: 90, reason: 'good' },
            { id: 'id2', title: 'Role B', company: 'Y', location: 'Melbourne', url: 'https://example/b', listedAgo: '2 days ago', description: '...', score: 80, reason: 'ok' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ) as any;
    }
    if (url.includes('/api/profiles')) {
      // Profiles list (and allow id GET to be empty for now)
      const body = { results: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
    }
    if (url.includes('/api/db/jobs')) {
      return new Response(
        JSON.stringify({
          total: 1,
          results: [
            { id: 'k1', key: 'example.com/a', title: 'Saved A', url: 'https://example/a', company: 'X', listedAgo: '1 day ago', modelScore: 77, userScore: null, source: 'jora', data: { location: 'Sydney' } },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ) as any;
    }
    if (url.includes('/api/db/feedback')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
    }
    return new Response('not found', { status: 404 }) as any;
  }) as any;
});

afterEach(() => {
  global.fetch = originalFetch as any;
});

function upload(file: File) {
  const input = screen.getByLabelText(/CV \(PDF\/DOCX\/TXT\)/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('App', () => {
  it('renders form and submits to find jobs, showing results', async () => {
    render(<App />);
    // Navigate to Live page (App initially lands on About)
    const liveTab = screen.getAllByRole('button', { name: /^Live$/i })[0];
    await userEvent.click(liveTab);

    const submit = screen.getByRole('button', { name: /Find Jobs/i });
    expect(submit).toBeDisabled();

    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' });
    upload(file);

    // Allow worldwide to bypass location requirement
    const anyCheckbox = screen.getByLabelText(/Any \(no location filter\)/i);
    await userEvent.click(anyCheckbox);

    expect(submit).toBeEnabled();

    await userEvent.click(submit);

    // results appear
    expect(await screen.findByText('Role A')).toBeInTheDocument();
    expect(await screen.findByText('Role B')).toBeInTheDocument();
  });

  it('loads Saved tab and fetches saved jobs', async () => {
    // Saved page defaults to tracked view (applied OR saved). Seed one saved key so item is shown.
    localStorage.setItem('savedForLater:v1', JSON.stringify(['example.com/a']));
    render(<App />);
    const savedTab = screen.getAllByRole('button', { name: /^Saved$/i })[0];
    await userEvent.click(savedTab);

    // Saved list loads and shows item
    expect(await screen.findByText('Saved A')).toBeInTheDocument();
  });
});
