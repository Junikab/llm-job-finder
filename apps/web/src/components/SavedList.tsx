import React, { useEffect, useMemo, useState } from 'react';
import type { SavedJob } from '../../../server/src/types';

export default function SavedList(props: {
  items: SavedJob[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onRate: (jobId: string, score: number) => void | Promise<void>;
}) {
  const { items, loading, error, onRefresh, onRate } = props;
  useEffect(() => { onRefresh(); /* fetch when mounted */ }, []);
  const [minScore, setMinScore] = useState<number>(0);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [maxDays, setMaxDays] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'model' | 'user' | 'recency'>('model');
  const [appliedOnly, setAppliedOnly] = useState(false);
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});

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
    const loc = location.trim().toLowerCase();
    const arr = items.filter((j: any) => {
      // applied filter
      if (appliedOnly && j.applied !== true) return false;
      // min model score
      if (typeof minScore === 'number' && minScore > 0) {
        if (j.modelScore == null || j.modelScore < minScore) return false;
      }
      // company substring
      if (comp && !(j.company || '').toLowerCase().includes(comp)) return false;
      // location (from nested data)
      if (loc) {
        const jl = (j.data?.location || '').toLowerCase();
        if (!jl.includes(loc)) return false;
      }
      // days filter (keep unknowns)
      if (maxDays !== '') {
        const d = parseListedDays(j.listedAgo);
        if (d != null && d > Number(maxDays)) return false;
      }
      return true;
    });
    const copy = [...arr];
    if (sortBy === 'model') {
      copy.sort((a, b) => (b.modelScore ?? -Infinity) - (a.modelScore ?? -Infinity));
    } else if (sortBy === 'user') {
      copy.sort((a, b) => (b.userScore ?? -Infinity) - (a.userScore ?? -Infinity));
    } else if (sortBy === 'recency') {
      const ad = (x: SavedJob) => {
        const d = parseListedDays(x.listedAgo);
        return d == null ? Infinity : d;
      };
      copy.sort((a, b) => ad(a) - ad(b));
    }
    return copy;
  }, [items, minScore, company, location, maxDays, sortBy]);

  const commitScore = (jobId: string) => {
    const current = draftScores[jobId];
    const job = items.find(j => j.id === jobId);
    if (current == null || !job || current === (job.userScore ?? 0)) {
      // nothing to do
      setDraftScores(prev => {
        if (prev[jobId] == null) return prev;
        const { [jobId]: _omit, ...rest } = prev;
        return rest;
      });
      return;
    }
    onRate(jobId, current);
    setDraftScores(prev => {
      const { [jobId]: _omit, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, margin: 0, color: '#333' }}>Saved</h2>
        <button type="button" onClick={() => onRefresh()} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Reload</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Min score</span>
            <input type="number" min={0} max={100} value={minScore}
              onChange={e => setMinScore(Math.max(0, Math.min(100, Number(e.target.value))))}
              style={{ width: 72 }} />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Company</span>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Atlassian" />
          </label> */}
          {/* <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Location</span>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sydney" />
          </label> */}
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Listed within</span>
            <select value={maxDays === '' ? '' : String(maxDays)} onChange={e => {
              const v = e.target.value;
              setMaxDays(v === '' ? '' : Number(v));
            }}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={appliedOnly} onChange={e => setAppliedOnly(e.target.checked)} />
            <span style={{ color: '#333' }}>Applied only</span>
          </label>
          <button type="button" onClick={() => { setMinScore(0); setCompany(''); setLocation(''); setMaxDays(''); }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Clear</button>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Sort by</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="model">Model score</option>
              <option value="user">Your score</option>
              <option value="recency">Recency</option>
            </select>
          </label>
        </div>
      </div>
      {loading && <div style={{ color: '#666' }}>Loading…</div>}
      {!!error && <div style={{ color: '#b00' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && <div style={{ color: '#666' }}>No saved jobs yet.</div>}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {filtered.map(j => (
          <li key={j.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              {j.url ? <a href={j.url} target="_blank" style={{ fontWeight: 600, color: '#0b5' }}>{j.title || j.id}</a> : <span style={{ fontWeight: 600 }}>{j.title || j.id}</span>}
              <div style={{ display: 'flex', gap: 12 }}>
                <span title="Model score" style={{ color: '#333' }}>Model: {j.modelScore != null ? Math.round(j.modelScore) : '–'}</span>
                <span title="Your score" style={{ color: '#333' }}>You: {j.userScore != null ? Math.round(j.userScore) : '–'}</span>
              </div>
            </div>
            <div style={{ color: '#555', marginTop: 4 }}>{j.company || 'Unknown'} · {j.listedAgo || '—'}</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 70, color: '#333' }}>Rate:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={draftScores[j.id] ?? (j.userScore ?? 0)}
                  onChange={e => setDraftScores(prev => ({ ...prev, [j.id]: Number(e.target.value) }))}
                  onPointerUp={() => commitScore(j.id)}
                  onBlur={() => commitScore(j.id)}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 36, textAlign: 'right', color: '#333' }}>{draftScores[j.id] ?? (j.userScore ?? 0)}</span>
              </label>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
