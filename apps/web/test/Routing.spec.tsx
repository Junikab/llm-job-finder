import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
  // prevent jsdom scrollTo errors
  (window as any).scrollTo = vi.fn();
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
});

afterEach(() => {
  global.fetch = originalFetch as any;
});

describe('Routing', () => {
  it('lands on /about and shows About content', async () => {
    const { container } = render(<App />);
    const root = within(container);
    expect(window.location.pathname).toBe('/about');
    expect(await root.findByText('Know which jobs deserve your energy.')).toBeInTheDocument();
  });

  it('navigates to /live and /saved via TopNav', async () => {
    const { container } = render(<App />);
    const root = within(container);

    // Live
    const liveBtn = root.getAllByRole('button', { name: /^Live$/i })[0];
    await userEvent.click(liveBtn);
    expect(window.location.pathname).toBe('/live');
    expect(root.getAllByRole('button', { name: 'Find Jobs' })[0]).toBeInTheDocument();

    // Saved
    const savedBtn = root.getAllByRole('button', { name: /^Saved$/i })[0];
    await userEvent.click(savedBtn);
    expect(window.location.pathname).toBe('/saved');
    // Saved page shows header and, when empty, a CTA button 'Find jobs'
    expect(root.getByRole('heading', { name: 'Saved Jobs' })).toBeInTheDocument();

    // Back to About
    const aboutLink = root.getByRole('link', { name: /About/i });
    await userEvent.click(aboutLink);
    expect(window.location.pathname).toBe('/about');
    expect(await root.findByText('Know which jobs deserve your energy.')).toBeInTheDocument();
  });
});
