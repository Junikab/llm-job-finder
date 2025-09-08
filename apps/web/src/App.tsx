import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findJobs } from './api';
import type { RankedJob, CVAnalysis } from '../../server/src/types';
import SavedList from './components/SavedList';
import AnalysisHeader from './components/AnalysisHeader';
import LiveResults from './components/LiveResults';
import LiveForm from './components/LiveForm';
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
  const [sortBy, setSortBy] = useState<'model' | 'recency'>('model');
  // Hero inputs now reuse RecentCVs + File and SearchUrlPicker
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1600);
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recent CVs (IndexedDB) via hook
  const {
    file,
    recent,
    recentSelectedId,
    setRecentSelectedId,
    onFileChange,
  } = useRecentCVs();

  // Search URL selection/history via hook
  const {
    searchUrl,
    setSearchUrl,
    history: searchUrlHistory,
    customMode: searchUrlCustomMode,
    setCustomMode: setSearchUrlCustomMode,
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
    if (!file) {
      showToast('Please upload CV or choose from recent CVs');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const form = new FormData();
      form.append('cv', file);
      // Optional manual search URL
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
  // Ensure mutually exclusive selection: selecting a recent CV clears the uploaded file input UI
  useEffect(() => {
    if (recentSelectedId && fileInputRef.current) {
      try { fileInputRef.current.value = ''; } catch {}
    }
  }, [recentSelectedId]);

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
    <div style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
      {/* Simple navbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#2a62ff' }}>LLM Job Finder</div>
        <div style={{ display: 'flex', gap: 18, color: '#455', fontSize: 14 }}>
          <button type="button" onClick={() => setTab('live')} style={{ background: 'transparent', border: 'none', color: tab === 'live' ? '#2a62ff' : '#455', fontWeight: tab === 'live' ? 700 : 500, cursor: 'pointer' }}>Live</button>
          <button type="button" onClick={() => setTab('saved')} style={{ background: 'transparent', border: 'none', color: tab === 'saved' ? '#2a62ff' : '#455', fontWeight: tab === 'saved' ? 700 : 500, cursor: 'pointer' }}>Saved</button>
          <span style={{ color: '#455' }}>About</span>
        </div>
      </div>

      {/* Hero section */}
      <div
        style={{
          position: 'relative',
          backgroundImage:
            'linear-gradient( to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.45) ), url(https://images.unsplash.com/photo-1522120692533-91be08007f30?q=80&w=1800&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          padding: '72px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0 18px' }}>Lets make it personal</h1>
          <LiveForm
            onSubmit={onSubmit}
            onFileChange={onFileChange}
            recent={recent}
            recentSelectedId={recentSelectedId}
            onChangeRecentSelected={setRecentSelectedId}
            searchUrlSelectValue={searchUrlSelectValue}
            searchUrlHistory={searchUrlHistory}
            searchUrlCustomMode={searchUrlCustomMode}
            setSearchUrlCustomMode={setSearchUrlCustomMode}
            searchUrl={searchUrl}
            onSearchUrlSelectChange={onSearchUrlSelectChange}
            onChangeSearchUrl={setSearchUrl}
            canSubmit={canSubmit}
            loading={loading}
            error={error}
            fileInputRef={fileInputRef}
            showInlineError={false}
          />
          <div style={{ marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
            {results.length > 0 ? `We have ${results.length} job offers for you!` : 'Upload your CV and optionally pick a recent URL.'}
          </div>
          {!!error && (
            <div style={{ marginTop: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#fee', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 12px', borderRadius: 8, textAlign: 'left' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Main content container */}
      <div style={{ padding: 16, maxWidth: 980, margin: '0 auto' }}>
      {tab === 'live' && (
        <>
          <AnalysisHeader analysis={analysis} searchUrls={searchUrls} />

          {/* Sort By between CV summary and job cards */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
            <span style={{ color: '#334155' }}>Sort by</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'model' | 'recency')}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
            >
              <option value="model">Model score</option>
              <option value="recency">Recency</option>
            </select>
          </div>

          <LiveResults results={results} loading={loading} sortBy={sortBy} />
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
      </div>
      {!!toast && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#111', color: '#fff', padding: '8px 12px', borderRadius: 8 }}>{toast}</div>
      )}
    </div>
  );
}
