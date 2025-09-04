import React, { useMemo } from 'react';
import type { RankedJob } from '../../../server/src/types';

export default function LiveResults({ results, loading, sortBy }: { results: RankedJob[]; loading: boolean; sortBy: 'model' | 'recency' }) {

  function parseListedDays(text?: string | null): number | null {
    if (!text) return null;
    const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith('hour') || unit === 'h') return 0;
    if (unit.startsWith('week') || unit === 'w') return n * 7;
    return n;
  }

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
        {filtered.map(r => (
          <li key={r.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <a href={r.url} target="_blank" style={{ fontWeight: 600, color: '#0b5' }}>{r.title}</a>
              <div style={{ fontWeight: 700 }}>{Math.round(r.score)}/100</div>
            </div>
            <div style={{ color: '#555', marginTop: 4 }}>{r.company} · {r.location} · {r.listedAgo}</div>
            <div style={{ marginTop: 8, color: '#333' }}>{r.reason}</div>
          </li>
        ))}
      </ol>

      {!loading && filtered.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>No results yet. Try adjusting location or days, or upload a different CV.</div>
      )}
    </>
  );
}
