import React, { useMemo } from 'react';
import type { RankedJob } from '@shared/types';
import { useAppliedJobs } from '../hooks/useAppliedJobs';
import { parseListedDays, formatAppliedDate } from '../utils/date';

export default function LiveResults({ results, loading, sortBy }: { results: RankedJob[]; loading: boolean; sortBy: 'model' | 'recency' }) {
  const { isApplied, setApplied, getAppliedAt } = useAppliedJobs();

  // Date utilities are shared in ../utils/date

  const filtered = useMemo(() => {
    const copy = [...results];
    if (sortBy === 'model') {
      copy.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    } else if (sortBy === 'recency') {
      const ad = (x: RankedJob) => {
        const d = parseListedDays(x.listedAgo);
        return d == null ? Infinity : d;
      };
      copy.sort((a, b) => ad(a) - ad(b));
    }
    return copy;
  }, [results, sortBy]);

  return (
    <>
      {/* filters are now moved to the hero section */}

      <ol className="job-list">
        {filtered.map(r => {
          const k = (r as any).key ?? r.id;
          const applied = isApplied(k);
          const appliedAtText = formatAppliedDate(getAppliedAt(k));
          const checkboxId = `applied-${k}`;
          return (
          <li key={k} className="job-card">
            <div className="job-card__header">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="job-card__titleLink">{r.title}</a>
              <div className="job-card__score">{Math.round(r.score)}/100</div>
            </div>
            <div className="job-card__metaRow">
              <div>{r.company} · {r.location} · {r.listedAgo}</div>
              <div className="job-card__appliedGroup">
                <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => setApplied(k, e.target.checked)} />
                <div className="job-card__appliedText">
                  <label htmlFor={checkboxId} className="job-card__appliedLabel">Applied</label>
                  {applied && appliedAtText && (
                    <span className="job-card__appliedDate">{appliedAtText}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="job-card__reason">{r.reason}</div>
          </li>
        );})}
      </ol>

      {!loading && filtered.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>No results yet. Try adjusting location or days, or upload a different CV.</div>
      )}
    </>
  );
}
