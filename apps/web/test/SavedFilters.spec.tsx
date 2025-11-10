import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import SavedList from '../src/components/SavedList';

import type { SavedJob } from '@shared/types';

function makeJob(id: string, key: string, title: string): SavedJob {
  return {
    id,
    key,
    title,
    url: `https://example.com/${id}`,
    company: 'Co',
    location: 'Sydney',
    listedAgo: '1 day ago',
    modelScore: 50,
    userScore: null,
    source: 'test'
  } as any;
}

describe('SavedList filters OR-logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows union of applied and saved when both toggles are on (OR)', async () => {
    // Seed tracked state: k1 applied, k2 saved
    localStorage.setItem('appliedJobs:v1', JSON.stringify(['k1']));
    localStorage.setItem('savedForLater:v1', JSON.stringify(['k2']));

    const items: SavedJob[] = [
      makeJob('1', 'k1', 'A'),
      makeJob('2', 'k2', 'B'),
    ];

    render(
      <SavedList
        items={items}
        loading={false}
        error={null}
        onRefresh={() => {}}
        onRate={() => {}}
        onGoLive={() => {}}
      />
    );

    // Default tracked-only view should show both A and B
    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(await screen.findByText('B')).toBeInTheDocument();

    // Applied only
    await userEvent.click(screen.getByLabelText(/Applied only/i));
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('B')).toBeNull();

    // Saved only
    await userEvent.click(screen.getByLabelText(/Applied only/i)); // turn off applied
    await userEvent.click(screen.getByLabelText(/Saved only/i));
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();

    // Both (OR)
    await userEvent.click(screen.getByLabelText(/Applied only/i));
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
