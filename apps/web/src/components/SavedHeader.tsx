import React from 'react';
import '../styles/about-page.css';
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

  let appliedCount = 0;
  let savedCount = 0;
  for (const j of items) {
    const k = j.key || j.id;
    if (isApplied(k)) appliedCount += 1;
    if (isSaved(k)) savedCount += 1;
  }

  return (
      <div style={{ marginBottom: 16 }}>
        <section className="aboutPage__hero" style={{ padding: '28px 24px', marginBottom:'50px'}}>
          <h2 className="aboutPage__title" style={{ margin: 0 }}>Saved Jobs</h2>
          <p className="aboutPage__subtitle" style={{ marginTop: 4 }}>Your saved jobs and applied status live here.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', color: '#1f2937', fontWeight: 600 }}>
            <span>Saved: {savedCount}</span>
            <span>Applied: {appliedCount}</span>
          </div>
        </section>
      </div>
  );
}
