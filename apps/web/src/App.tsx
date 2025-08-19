import React, { useMemo, useState } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5174';

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

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState('Sydney NSW');
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RankedJob[]>([]);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

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
          <div>Listed within (days)</div>
          <input type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value))} />
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

      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {results.map(r => (
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

      {!loading && results.length === 0 && (
        <div style={{ marginTop: 16, color: '#666' }}>No results yet. Try adjusting location or days, or upload a different CV.</div>
      )}
    </div>
  );
}
