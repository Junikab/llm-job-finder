import React from 'react';

import '../styles/SavedPage.css';
import { useTrackedJobs } from '../hooks/useTrackedJobs';

import type { SavedJob } from '@shared/types';

export type SavedHeaderProps = {
  items: SavedJob[];
};

export function SavedHeader(props: SavedHeaderProps) {
  const { items } = props;
  const { isApplied, isSaved } = useTrackedJobs();

  let appliedCount = 0;
  let savedCount = 0;
  for (const j of items) {
    const k = j.key || j.id;
    if (isApplied(k)) appliedCount += 1;
    if (isSaved(k)) savedCount += 1;
  }

  return (
    <div className="savedHeader">
      <section className="savedHeader__hero">
        <h2 className="savedHeader__title">Saved Jobs</h2>
        <p className="savedHeader__subtitle">Your saved jobs and applied status live here.</p>
        <div className="savedHeader__counts">
          <span>Saved: {savedCount}</span>
          <span>Applied: {appliedCount}</span>
        </div>
      </section>
    </div>
  );
}
