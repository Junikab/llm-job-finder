import React from 'react';
import '../styles/about-page.css';
import '../styles/SavedPage.css';
import type { SavedJob } from '@shared/types';
import { useTrackedJobs } from '../hooks/useTrackedJobs';

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
      <section className="aboutPage__hero savedHeader__hero">
        <h2 className="aboutPage__title">Saved Jobs</h2>
        <p className="aboutPage__subtitle">Your saved jobs and applied status live here.</p>
        <div className="savedHeader__counts">
          <span>Saved: {savedCount}</span>
          <span>Applied: {appliedCount}</span>
        </div>
      </section>
    </div>
  );
}
