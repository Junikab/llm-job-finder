import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findJobs } from './api';
import type { RankedJob, CVAnalysis } from '../../server/src/types';
import SavedList from './components/SavedList';
import AnalysisHeader from './components/AnalysisHeader';
import LiveResults from './components/LiveResults';
import { useRecentCVs } from './hooks/useRecentCVs';
import { useSearchUrl } from './hooks/useSearchUrl';
import { useSavedJobs } from './hooks/useSavedJobs';
import TopNav from './components/TopNav';
import SortSelect from './components/SortSelect';
import Toast from './components/Toast';
import HeroSection from './components/HeroSection';
import { useTab } from './hooks/useTab';
import { useToast } from './hooks/useToast';

export default function App() {
  // Tabs and UI state
  const { tab, setTab } = useTab();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RankedJob[]>([]);
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [searchUrls, setSearchUrls] = useState<string[]>([]);
  const [llmGoodTraits, setLlmGoodTraits] = useState<string>('');
  const [llmBadTraits, setLlmBadTraits] = useState<string>('');
  const [llmPromptUserPreview, setLlmPromptUserPreview] = useState<string | undefined>();
  const [llmPromptSystem, setLlmPromptSystem] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<'model' | 'recency'>('model');
  // Toast
  const { toast, showToast } = useToast(1600);
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
      setLlmGoodTraits(json.llmGoodTraits || '');
      setLlmBadTraits(json.llmBadTraits || '');
      setLlmPromptUserPreview(json.llmPromptUserPreview || undefined);
      setLlmPromptSystem(json.llmPromptSystem || undefined);
      setResults(json.results || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, searchUrl, loading, updateSearchUrlHistory]);

  // File change, recent CVs handlers are provided by useRecentCVs
  // Ensure mutually exclusive selection: selecting a recent CV clears the uploaded file input UI
  useEffect(() => {
    if (recentSelectedId && fileInputRef.current) {
      try { fileInputRef.current.value = ''; } catch {}
    }
  }, [recentSelectedId]);

  // Saved jobs handlers come from useSavedJobs

  return (
    <div className="app-root">
      {/* Simple navbar */}
      <TopNav tab={tab} onChange={setTab} />

      {/* Hero section */}
      <HeroSection
        resultsCount={results.length}
        error={error}
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
        fileInputRef={fileInputRef}
      />

      {/* Main content container */}
      <div className="content-container">
      {tab === 'live' && (
        <>
          <AnalysisHeader analysis={analysis} searchUrls={searchUrls} llmGoodTraits={llmGoodTraits} llmBadTraits={llmBadTraits} llmPromptUserPreview={llmPromptUserPreview} llmPromptSystem={llmPromptSystem} />

          {/* Sort By between CV summary and job cards */}
          <SortSelect sortBy={sortBy} onChange={setSortBy} />

          <LiveResults results={results} loading={loading} sortBy={sortBy} />
        </>
      )}

      {tab === 'saved' && (
        <div className="saved-section">
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
      <Toast message={toast} />
    </div>
  );
}
