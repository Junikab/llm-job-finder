import { render, screen, fireEvent } from '@testing-library/react';
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

function mockFindReturnsOne() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/jobs/find')) {
      return new Response(
        JSON.stringify({
          analysis: { summary: 'x' },
          searchUrls: [],
          results: [
            { id: 'id1', key: 'example.com/a', title: 'Role A', company: 'X', location: 'Sydney', url: 'https://example/a', listedAgo: '1 day ago', description: '...', score: 90, reason: 'good' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ) as any;
    }
    if (url.includes('/api/profiles')) {
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) as any;
    }
    return new Response('not found', { status: 404 }) as any;
  }) as any;
}

beforeEach(() => {
  localStorage.clear();
  (window as any).scrollTo = vi.fn();
  mockFindReturnsOne();
});

afterEach(() => {
  global.fetch = originalFetch as any;
});

function goLiveAndSearch() {
  const liveBtn = screen.getAllByRole('button', { name: /^Live$/i })[0];
  return userEvent.click(liveBtn).then(async () => {
    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/CV \(PDF\/DOCX\/TXT\)/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    const anyCheckbox = screen.getByRole('checkbox', { name: /Any \(no location filter\)/i });
    await userEvent.click(anyCheckbox);
    const submit = screen.getAllByRole('button', { name: 'Find Jobs' })[0];
    await userEvent.click(submit);
    await screen.findByText('Role A');
  });
}

describe('Tracked toggles persistence', () => {
  it('updates localStorage when toggling Applied and Save for later', async () => {
    render(<App />);
    await goLiveAndSearch();

    const saveInput = screen.getByLabelText(/Save for later/i) as HTMLInputElement;
    const appliedInput = screen.getByLabelText(/Applied/i) as HTMLInputElement;

    expect(saveInput.checked).toBe(false);
    expect(appliedInput.checked).toBe(false);

    await userEvent.click(saveInput);
    await userEvent.click(appliedInput);

    const savedRaw = localStorage.getItem('savedForLater:v1');
    const appliedRaw = localStorage.getItem('appliedJobs:v1');
    const appliedAtRaw = localStorage.getItem('appliedJobsAt:v1');

    expect(savedRaw).toBeTruthy();
    expect(appliedRaw).toBeTruthy();
    expect(appliedAtRaw).toBeTruthy();

    const savedArr = JSON.parse(savedRaw || '[]');
    const appliedArr = JSON.parse(appliedRaw || '[]');
    const appliedAt = JSON.parse(appliedAtRaw || '{}');

    expect(savedArr).toContain('example.com/a');
    expect(appliedArr).toContain('example.com/a');
    expect(typeof appliedAt['example.com/a']).toBe('string');
  });

  it('rehydrates saved/applied states from localStorage on fresh mount', async () => {
    localStorage.setItem('savedForLater:v1', JSON.stringify(['example.com/a']));
    localStorage.setItem('appliedJobs:v1', JSON.stringify(['example.com/a']));

    render(<App />);
    await goLiveAndSearch();

    const saveInput = screen.getByLabelText(/Save for later/i) as HTMLInputElement;
    const appliedInput = screen.getByLabelText(/Applied/i) as HTMLInputElement;

    expect(saveInput.checked).toBe(true);
    expect(appliedInput.checked).toBe(true);
  });
});
