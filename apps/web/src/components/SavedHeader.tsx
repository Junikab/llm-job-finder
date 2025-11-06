import React from 'react';
import type { SavedJob } from '@shared/types';
import { useAppliedJobs } from '../hooks/useAppliedJobs';
import { useSavedForLater } from '../hooks/useSavedForLater';

export type SavedHeaderProps = {
  items: SavedJob[];
};

export function SavedHeader(props: SavedHeaderProps) {
  const { items } = props;
  const { isApplied } = useAppliedJobs();
  const { isSaved } = useSavedForLater();

  const total = items.length;
  let appliedCount = 0;
  let savedCount = 0;
  for (const j of items) {
    const k = j.key || j.id;
    if (isApplied(k)) appliedCount += 1;
    if (isSaved(k)) savedCount += 1;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: 0 }}>Saved jobs</h2>
          <div style={{ color: '#666', fontSize: 14 }}>Your saved jobs and applied status live here.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, color: '#444', fontSize: 14 }}>
        <span>Total: {total}</span>
        <span>Saved: {savedCount}</span>
        <span>Applied: {appliedCount}</span>
      </div>
    </div>
  );
}
