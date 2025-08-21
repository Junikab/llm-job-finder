import React, { useEffect, useMemo, useState } from 'react';

// Use same-origin by default so Vite can proxy /api to 5174 in dev
const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL) ?? '').trim();

type RankedJob = {
  id: string; title: string; company?: string; location?: string; url: string;
  listedAgo?: string; description?: string; score: number; reason: string;
};

type CVAnalysis = {
  summary: string;
  titles: string[];
  topSkills: string[];
  niceToHave?: string[];
};

type SavedJob = {
  id: string;
  key: string;
  title: string | null;
  url: string | null;
  company: string | null;
  listedAgo: string | null;
  modelScore: number | null;
  userScore: number | null;
  source: string;
  data?: any;
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState('Sydney NSW');
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RankedJob[]>([]);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [tab, setTab] = useState<'live' | 'saved'>('live');
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Live filters
  const [liveMinScore, setLiveMinScore] = useState<number>(0);
  const [liveCompany, setLiveCompany] = useState('');
  const [liveLocation, setLiveLocation] = useState('');
  const [liveMaxDays, setLiveMaxDays] = useState<number | ''>('');
  const [sortByLive, setSortByLive] = useState<'model' | 'recency'>('model');
  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

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

  const filteredLive = useMemo(() => {
    const comp = liveCompany.trim().toLowerCase();
    const locq = liveLocation.trim().toLowerCase();
    const arr = results.filter(r => {
      if (typeof liveMinScore === 'number' && liveMinScore > 0) {
        if (r.score == null || r.score < liveMinScore) return false;
      }
      if (comp && !(r.company || '').toLowerCase().includes(comp)) return false;
      if (locq && !(r.location || '').toLowerCase().includes(locq)) return false;
      if (liveMaxDays !== '') {
        const d = parseListedDays(r.listedAgo);
        if (d != null && d > Number(liveMaxDays)) return false;
      }
      return true;
    });
    // sort
    const copy = [...arr];
    if (sortByLive === 'model') {
      copy.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    } else if (sortByLive === 'recency') {
      const ad = (x: RankedJob) => {
        const d = parseListedDays(x.listedAgo);
        return d == null ? Infinity : d;
      };
      copy.sort((a, b) => ad(a) - ad(b)); // newest (fewest days) first
    }
    return copy;
  }, [results, liveMinScore, liveCompany, liveLocation, liveMaxDays, sortByLive]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const form = new FormData();
      form.append('cv', file);
      form.append('location', location);
      form.append('days', String(days));

      const res = await fetch(`${API_BASE}/api/jobs/find`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setAnalysis(json.analysis);
      setSearchUrls(json.searchUrls || []);
      setResults(json.results || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 16, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>LLM Job Finder</h1>
      <p style={{ color: '#555', marginBottom: 16 }}>Upload your CV, we’ll search Jora and rank roles using an LLM.</p>
      <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
        <button
          type="button"
          onClick={() => setTab('live')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'live' ? '#111' : '#f7f7f7', color: tab === 'live' ? '#fff' : '#111' }}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => setTab('saved')}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'saved' ? '#111' : '#f7f7f7', color: tab === 'saved' ? '#fff' : '#111' }}
        >
          Saved
        </button>
      </div>

      {tab === 'live' && (
        <>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, alignItems: 'center', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
            <label style={{ gridColumn: '1 / -1' }}>
              <div>CV (PDF/DOCX/TXT)</div>
              <input type="file" accept=".pdf,.docx,.txt" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            <label>
              <div>Location</div>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Sydney NSW" />
            </label>
            <label>
              <div>Listed within</div>
              <select value={days} onChange={e => setDays(Number(e.target.value))}>
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button disabled={!canSubmit} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', background: canSubmit ? '#111' : '#888', color: 'white' }}>
                {loading ? 'Finding…' : 'Find Jobs'}
              </button>
            </div>
            {!!error && (
              <div style={{ gridColumn: '1 / -1', color: '#b00' }}>{error}</div>
            )}
          </form>

          {!!analysis && (
            <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
              <strong>Detected summary:</strong>
              <div style={{ color: '#333' }}>{analysis.summary}</div>
              <div style={{ marginTop: 6, color: '#555' }}><strong>Titles:</strong> {analysis.titles?.join(', ')}</div>
              <div style={{ marginTop: 6, color: '#555' }}><strong>Top skills:</strong> {analysis.topSkills?.join(', ')}</div>
              {!!(searchUrls?.length) && (
                <div style={{ marginTop: 6 }}>
                  <strong>Search URLs:</strong> {searchUrls.map((u: string) => {
                    try {
                      const q = new URL(u).searchParams.get('q') || u;
                      return (<a key={u} href={u} target="_blank" style={{ marginLeft: 8 }}>{q}</a>);
                    } catch {
                      return null;
                    }
                  })}
                </div>
              )}
            </div>
          )}

          {/* Live filters */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#333' }}>Min score</span>
              <input type="number" min={0} max={100} value={liveMinScore}
                onChange={e => setLiveMinScore(Math.max(0, Math.min(100, Number(e.target.value))))}
                style={{ width: 72 }} />
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#333' }}>Company</span>
              <input value={liveCompany} onChange={e => setLiveCompany(e.target.value)} placeholder="e.g. Atlassian" />
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#333' }}>Location</span>
              <input value={liveLocation} onChange={e => setLiveLocation(e.target.value)} placeholder="e.g. Sydney" />
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#333' }}>Days</span>
              <input type="number" min={0} max={60}
                value={liveMaxDays}
                onChange={e => {
                  const v = e.target.value;
                  setLiveMaxDays(v === '' ? '' : Math.max(0, Math.min(60, Number(v))));
                }}
                style={{ width: 72 }} />
            </label>
            <button type="button" onClick={() => { setLiveMinScore(0); setLiveCompany(''); setLiveLocation(''); setLiveMaxDays(''); }}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Clear</button>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
              <span style={{ color: '#333' }}>Sort by</span>
              <select value={sortByLive} onChange={e => setSortByLive(e.target.value as any)}>
                <option value="model">Model score</option>
                <option value="recency">Recency</option>
              </select>
            </label>
          </div>

          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {filteredLive.map(r => (
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

          {!loading && filteredLive.length === 0 && (
            <div style={{ marginTop: 16, color: '#666' }}>No results yet. Try adjusting location or days, or upload a different CV.</div>
          )}
        </>
      )}

      {tab === 'saved' && (
        <div style={{ marginTop: 8 }}>
          {/* Fetch on enter Saved tab */}
          <SavedList
            items={saved}
            loading={savedLoading}
            error={savedError}
            onRefresh={async () => {
              setSavedLoading(true);
              setSavedError(null);
              try {
                const res = await fetch(`${API_BASE}/api/db/jobs`);
                if (!res.ok) throw new Error(`Failed: ${res.status}`);
                const json = await res.json();
                setSaved(Array.isArray(json.results) ? json.results : []);
              } catch (err: any) {
                setSavedError(err?.message || 'Failed to load saved jobs');
              } finally {
                setSavedLoading(false);
              }
            }}
            onRate={async (jobId, nextScore) => {
              // optimistic update with revert capture
              let prevScore: number | null = null;
              setSaved(prev => {
                const found = prev.find(j => j.id === jobId);
                prevScore = found?.userScore ?? null;
                return prev.map(j => j.id === jobId ? { ...j, userScore: nextScore } : j);
              });
              try {
                const res = await fetch(`${API_BASE}/api/db/feedback`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ jobId, userScore: nextScore })
                });
                if (!res.ok) throw new Error(`Failed: ${res.status}`);
                setToast('Saved');
                setTimeout(() => setToast(null), 1600);
                // refetch latest aggregate
                try {
                  setSavedLoading(true);
                  const r2 = await fetch(`${API_BASE}/api/db/jobs`);
                  if (r2.ok) {
                    const j2 = await r2.json();
                    setSaved(Array.isArray(j2.results) ? j2.results : []);
                  }
                } finally {
                  setSavedLoading(false);
                }
              } catch (err: any) {
                setToast('Save failed');
                setTimeout(() => setToast(null), 1600);
                // revert
                setSaved(prev => prev.map(j => j.id === jobId ? { ...j, userScore: prevScore } : j));
              }
            }}
          />
        </div>
      )}
      {!!toast && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>{toast}</div>
      )}
    </div>
  );
}

function SavedList(props: {
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
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Min score</span>
            <input type="number" min={0} max={100} value={minScore}
              onChange={e => setMinScore(Math.max(0, Math.min(100, Number(e.target.value))))}
              style={{ width: 72 }} />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Company</span>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Atlassian" />
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: '#333' }}>Location</span>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sydney" />
          </label>
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
