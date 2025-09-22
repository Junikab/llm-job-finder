import React, { useMemo } from 'react';
import type { RankedJob } from '../../../server/src/types';
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

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {filtered.map(r => {
          const k = (r as any).key ?? r.id;
          const applied = isApplied(k);
          const appliedAtText = formatAppliedDate(getAppliedAt(k));
          const checkboxId = `applied-${k}`;
          return (
          <li key={k} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <a href={r.url} target="_blank" style={{ fontWeight: 600, color: '#0b5' }}>{r.title}</a>
              <div style={{ fontWeight: 700 }}>{Math.round(r.score)}/100</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555', marginTop: 4, gap: 8 }}>
              <div>{r.company} · {r.location} · {r.listedAgo}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => setApplied(k, e.target.checked)} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor={checkboxId} style={{ fontSize: 12, color: '#222' }}>Applied</label>
                  {applied && appliedAtText && (
                    <span style={{ fontSize: 11, color: '#777' }}>{appliedAtText}</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 8, color: '#333' }}>{r.reason}</div>
          </li>
        );})}
      </ol>

      {!loading && filtered.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>No results yet. Try adjusting location or days, or upload a different CV.</div>
      )}
    </>
  );
}
