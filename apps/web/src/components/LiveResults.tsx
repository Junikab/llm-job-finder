import React, { useMemo } from 'react';

import { useTrackedJobs } from '../hooks/useTrackedJobs';
import { sortJobs } from '../lib/job-filters';

import { LiveJobCard } from './LiveJobCard';

import type { RankedJob } from '@shared/types';

export default function LiveResults({ results, loading, sortBy }: { results: RankedJob[]; loading: boolean; sortBy: 'model' | 'recency' }) {
  const { isApplied, setApplied, getAppliedAt, isSaved, setSaved, getSavedAt } = useTrackedJobs();

  // Date utilities are shared in ../utils/date

  const filtered = useMemo(() => sortJobs(results, sortBy), [results, sortBy]);

  return (
    <>
      {/* filters are now moved to the hero section */}

      <ol className="job-list">
        {filtered.map(r => {
          const k = r.key || r.id;
          return (
            <LiveJobCard
              key={k}
              job={r}
              isApplied={isApplied}
              getAppliedAt={getAppliedAt}
              setApplied={setApplied}
              isSaved={isSaved}
              getSavedAt={getSavedAt}
              setSaved={setSaved}
            />
          );
        })}
      </ol>

      {!loading && filtered.length === 0 && (
        <div className="liveResults__empty">No results yet. Try adjusting location or upload a different CV.</div>
      )}
    </>
  );
}
