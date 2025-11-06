import React, { useMemo } from 'react';
import type { RankedJob } from '@shared/types';
import { useTrackedJobs } from '../hooks/useTrackedJobs';
import { sortJobs } from '../lib/job-filters';
import { formatAppliedDate } from '../utils/date';

export default function LiveResults({ results, loading, sortBy }: { results: RankedJob[]; loading: boolean; sortBy: 'model' | 'recency' }) {
  const { isApplied, setApplied, getAppliedAt, isSaved, setSaved, getSavedAt } = useTrackedJobs();

  // Date utilities are shared in ../utils/date

  const filtered = useMemo(() => sortJobs(results, sortBy), [results, sortBy]);

  return (
    <>
      {/* filters are now moved to the hero section */}

      <ol className="job-list">
        {filtered.map(r => {
          const k = (r as any).key ?? r.id;
          const applied = isApplied(k);
          const appliedAtText = formatAppliedDate(getAppliedAt(k));
          const checkboxId = `applied-${k}`;
          const saved = isSaved(k);
          const savedAtText = formatAppliedDate(getSavedAt(k));
          const savedCheckboxId = `saved-${k}`;
          return (
          <li key={k} className="job-card">
            <div className="job-card__header">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="job-card__titleLink">{r.title}</a>
              <div className="job-card__score">{Math.round(r.score)}/100</div>
            </div>
            <div className="job-card__metaRow">
              <div>{r.company} · {r.location} · {r.listedAgo}</div>
              <div className="job-card__togglesRow">
                <div className="job-card__appliedGroup">
                  <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => setApplied(k, e.target.checked)} />
                  <div className="job-card__appliedText">
                    <label htmlFor={checkboxId} className="job-card__appliedLabel">Applied</label>
                    {applied && appliedAtText && (
                      <span className="job-card__appliedDate">{appliedAtText}</span>
                    )}
                  </div>
                </div>
                <div className="job-card__savedGroup">
                  <input id={savedCheckboxId} type="checkbox" checked={saved} onChange={(e) => setSaved(k, e.target.checked)} />
                  <div className="job-card__savedText">
                    <label htmlFor={savedCheckboxId} className="job-card__savedLabel">Save for later</label>
                    {saved && savedAtText && (
                      <span className="job-card__savedDate">{savedAtText}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="job-card__reason">{r.reason}</div>
          </li>
        );})}
      </ol>

      {!loading && filtered.length === 0 && (
        <div className="liveResults__empty">No results yet. Try adjusting location or days, or upload a different CV.</div>
      )}
    </>
  );
}
