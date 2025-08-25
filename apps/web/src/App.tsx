import React, { useEffect, useMemo, useState } from 'react';
import { listCVs, getCVFile, saveCV, removeCV, type CVMeta } from './idb';
import { findJobs, listSavedJobs, sendFeedback } from './api';
import type { RankedJob, SavedJob, CVAnalysis } from '../../server/src/types';
import SavedList from './components/SavedList';
import AnalysisHeader from './components/AnalysisHeader';
import LiveResults from './components/LiveResults';
import RecentCVs from './components/RecentCVs';

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
  // Recent CVs (IndexedDB)
  const [recent, setRecent] = useState<CVMeta[]>([]);
  const [recentSelectedId, setRecentSelectedId] = useState<string>('');
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

      const json = await findJobs(form);
      setAnalysis(json.analysis);
      setSearchUrls(json.searchUrls || []);
      setResults(json.results || []);
      // Save CV into IndexedDB (dedupe by name+size)
      try {
        const existing = await listCVs();
        const has = existing.some(m => m.name === file.name && m.size === file.size);
        if (!has) await saveCV(file);
        setRecent(await listCVs());
      } catch {}
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Load recent CVs on mount
  useEffect(() => {
    (async () => {
      try { setRecent(await listCVs()); } catch {}
    })();
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      try {
        const existing = await listCVs();
        const has = existing.some(m => m.name === f.name && m.size === f.size);
        if (!has) await saveCV(f);
        setRecent(await listCVs());
      } catch {}
    }
  }

  async function useSelectedRecent() {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      const f = await getCVFile(id);
      if (f) setFile(f);
    } catch {}
  }

  async function removeSelectedRecent() {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      await removeCV(id);
      setRecentSelectedId('');
      setRecent(await listCVs());
    } catch {}
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
              <input type="file" accept=".pdf,.docx,.txt" onChange={onFileChange} />
            </label>
            {/* Recent CVs picker */}
            <RecentCVs
              recent={recent}
              recentSelectedId={recentSelectedId}
              onChangeSelected={setRecentSelectedId}
              onUseSelected={useSelectedRecent}
              onRemoveSelected={removeSelectedRecent}
            />
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

          <AnalysisHeader analysis={analysis} searchUrls={searchUrls} />

          <LiveResults results={results} loading={loading} />
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
                const results = await listSavedJobs();
                setSaved(results);
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
                await sendFeedback(jobId, nextScore);
                setToast('Saved');
                setTimeout(() => setToast(null), 1600);
                // refetch latest aggregate
                try {
                  setSavedLoading(true);
                  const updated = await listSavedJobs();
                  setSaved(updated);
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
