import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findJobs } from './api';
import type { RankedJob, CVAnalysis } from '../../server/src/types';
import SavedList from './components/SavedList';
import AnalysisHeader from './components/AnalysisHeader';
import LiveResults from './components/LiveResults';
import RecentCVs from './components/RecentCVs';
import SearchUrlPicker from './components/SearchUrlPicker';
import { useRecentCVs } from './hooks/useRecentCVs';
import { useSearchUrl } from './hooks/useSearchUrl';
import { useSavedJobs } from './hooks/useSavedJobs';

export default function App() {
  // Tabs and UI state
  const [tab, setTab] = useState<'live' | 'saved'>(() => (typeof window !== 'undefined' && localStorage.getItem('tab') === 'saved' ? 'saved' : 'live'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RankedJob[]>([]);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  // Recent CVs (IndexedDB) via hook
  const {
    file,
    recent,
    recentSelectedId,
    setRecentSelectedId,
    onFileChange,
    useSelectedRecent,
    removeSelectedRecent,
  } = useRecentCVs();

  // Search URL selection/history via hook
  const {
    searchUrl,
    setSearchUrl,
    history: searchUrlHistory,
    customMode: searchUrlCustomMode,
    selectValue: searchUrlSelectValue,
    onSelectChange: onSearchUrlSelectChange,
    updateHistory: updateSearchUrlHistory,
  } = useSearchUrl();

  // Saved jobs via hook
  const { saved, savedLoading, savedError, refreshSaved: handleRefreshSaved, rate: handleRate } = useSavedJobs((msg) => showToast(msg));

  // Allow submit with CV only (auto-generate URLs) or with manual URL
  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const form = new FormData();
      form.append('cv', file);
      const su = (searchUrl || '').trim();
      if (su) form.append('searchUrl', su);

      // Update history if using a manual URL
      if (su) updateSearchUrlHistory(su);

      const json = await findJobs(form);
      setAnalysis(json.analysis);
      setSearchUrls(json.searchUrls || []);
      setResults(json.results || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, searchUrl, loading, updateSearchUrlHistory]);

  // Persist tab selection
  useEffect(() => {
    try { localStorage.setItem('tab', tab); } catch {}
  }, [tab]);

  // File change, recent CVs handlers are provided by useRecentCVs

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  // Saved jobs handlers come from useSavedJobs

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
            <SearchUrlPicker
              selectValue={searchUrlSelectValue}
              history={searchUrlHistory}
              customMode={searchUrlCustomMode}
              searchUrl={searchUrl}
              onSelectChange={onSearchUrlSelectChange}
              onChangeCustom={setSearchUrl}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <button aria-busy={loading} disabled={!canSubmit} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', background: canSubmit ? '#111' : '#888', color: 'white' }}>
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
            onRefresh={handleRefreshSaved}
            onRate={handleRate}
          />
        </div>
      )}
      {!!toast && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>{toast}</div>
      )}
    </div>
  );
}
