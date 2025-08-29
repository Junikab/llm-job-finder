import React, { useMemo, useState } from 'react';
import type { RankedJob } from '../../../server/src/types';

export default function LiveResults({ results, loading }: { results: RankedJob[]; loading: boolean }) {
  const [minScore, setMinScore] = useState<number>(0);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [maxDays, setMaxDays] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'model' | 'recency'>('model');

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
    const comp = company.trim().toLowerCase();
    const locq = location.trim().toLowerCase();
    const arr = results.filter(r => {
      if (typeof minScore === 'number' && minScore > 0) {
        if (r.score == null || r.score < minScore) return false;
      }
      if (comp && !(r.company || '').toLowerCase().includes(comp)) return false;
      if (locq && !(r.location || '').toLowerCase().includes(locq)) return false;
      if (maxDays !== '') {
        const d = parseListedDays(r.listedAgo);
        if (d != null && d > Number(maxDays)) return false;
      }
      return true;
    });
    const copy = [...arr];
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
  }, [results, minScore, company, location, maxDays, sortBy]);

  return (
    <>
      {/* Live filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#333' }}>Min score</span>
          <input type="number" min={0} max={100} value={minScore}
            onChange={e => setMinScore(Math.max(0, Math.min(100, Number(e.target.value))))}
            style={{ width: 72 }} />
        </label> */}
        {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#333' }}>Company</span>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Atlassian" />
        </label> */}
        {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#333' }}>Location</span>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sydney" />
        </label> */}
        {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: '#333' }}>Days</span>
          <input type="number" min={0} max={60}
            value={maxDays}
            onChange={e => {
              const v = e.target.value;
              setMaxDays(v === '' ? '' : Math.max(0, Math.min(60, Number(v))));
            }}
            style={{ width: 72 }} />
        </label> */}
        {/* <button type="button" onClick={() => { setMinScore(0); setCompany(''); setLocation(''); setMaxDays(''); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Clear</button> */}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <span style={{ color: '#333' }}>Sort by</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="model">Model score</option>
            <option value="recency">Recency</option>
          </select>
        </label>
      </div>

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
