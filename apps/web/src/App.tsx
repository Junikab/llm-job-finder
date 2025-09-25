import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findJobs } from './api';
import type { RankedJob, CVAnalysis } from '@shared/types';
import SavedList from './components/SavedList';
import AnalysisHeader from './components/AnalysisHeader';
import LiveResults from './components/LiveResults';
import { useSearchUrl } from './hooks/useSearchUrl';
import { useSavedJobs } from './hooks/useSavedJobs';
import TopNav from './components/TopNav';
import { ProfileControls } from './components/ProfileControls';
import SortSelect from './components/SortSelect';
import Toast from './components/Toast';
import HeroSection from './components/HeroSection';
import { useTab } from './hooks/useTab';
import { useToast } from './hooks/useToast';
import AboutModal from './components/AboutModal';
import { useAnalysisEditor } from './hooks/useAnalysisEditor';
import { useActiveProfileMeta } from './hooks/useActiveProfileMeta';

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
  const [aboutOpen, setAboutOpen] = useState(false);
  // Toast
  const { toast, showToast } = useToast(1600);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis editor (extracted logic: edit + rescore)
  const {
    draft: draftAnalysis,
    isEditing: isEditingAnalysis,
    rescoring,
    startEdit: startEditAnalysis,
    cancelEdit: cancelEditAnalysis,
    onChangeDraft,
    handleRescore,
  } = useAnalysisEditor({ analysis, onToast: showToast });

  // Active profile meta (for display); managed at App-level now
  const { activeProfileMeta, setActiveProfileMeta } = useActiveProfileMeta();

  // Simplified file upload state (Recent CVs removed)
  const [file, setFile] = useState<File | null>(null);
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }, []);

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

  // Persist latest live results in localStorage so they survive page refreshes
  const LIVE_CACHE_KEY = 'liveResults:v1';
  function loadLiveCache(): any | null {
    try {
      const raw = localStorage.getItem(LIVE_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.results)) return null;
      return obj;
    } catch {
      return null;
    }
  }
  function saveLiveCache(payload: any) {
    try {
      localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
    } catch {}
  }

  // On first load, restore last successful results if present
  useEffect(() => {
    const cached = loadLiveCache();
    if (cached && Array.isArray(cached.results) && cached.results.length > 0) {
      setAnalysis(cached.analysis ?? null);
      setSearchUrls(cached.searchUrls ?? []);
      setLlmGoodTraits(cached.llmGoodTraits || '');
      setLlmBadTraits(cached.llmBadTraits || '');
      setLlmPromptUserPreview(cached.llmPromptUserPreview || undefined);
      setLlmPromptSystem(cached.llmPromptSystem || undefined);
      setResults(cached.results);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a successful fetch (not during loading) persist the latest results snapshot
  useEffect(() => {
    if (!loading && results.length > 0) {
      saveLiveCache({ analysis, searchUrls, results, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem });
    }
  }, [loading, analysis, searchUrls, results, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem]);

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
      // Reset edit state after a fresh search
      cancelEditAnalysis();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [file, searchUrl, loading, updateSearchUrlHistory]);

  // (Rescore handler provided by the hook; we just adapt it to our state setters)
  const onRescore = useCallback(() => {
    handleRescore(results, {
      onResults: setResults,
      onAnalysisCommitted: setAnalysis,
      onEditingDone: () => {},
      onPromptUpdated: ({ user, system }) => {
        if (typeof user === 'string') setLlmPromptUserPreview(user);
        if (typeof system === 'string') setLlmPromptSystem(system);
      },
      onSearchUrlsUpdated: (urls: string[]) => {
        setSearchUrls(urls);
      },
    });
  }, [handleRescore, results]);

  // Recent CVs removed – no extra effects needed

  // Saved jobs handlers come from useSavedJobs

  return (
    <div className="app-root">
      {/* Simple navbar */}
      <TopNav tab={tab} onChange={setTab} onAbout={() => setAboutOpen(true)} />

      {/* Hero section */}
      <HeroSection
        resultsCount={results.length}
        error={error}
        onSubmit={onSubmit}
        onFileChange={onFileChange}
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
          {/* Profiles: always visible above the analysis container */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <ProfileControls
              draft={draftAnalysis || analysis}
              isEditing={isEditingAnalysis}
              onApplyProfile={(a) => onChangeDraft({ ...a })}
              onProfileLoadMeta={(meta) => setActiveProfileMeta(meta)}
            />
          </div>

          <AnalysisHeader
            analysis={analysis}
            searchUrls={searchUrls}
            llmGoodTraits={llmGoodTraits}
            llmBadTraits={llmBadTraits}
            llmPromptUserPreview={llmPromptUserPreview}
            llmPromptSystem={llmPromptSystem}
            draft={draftAnalysis}
            isEditing={isEditingAnalysis}
            onStartEdit={startEditAnalysis}
            onCancelEdit={cancelEditAnalysis}
            onChangeDraft={onChangeDraft}
            onRescore={onRescore}
            rescoring={rescoring}
            activeProfileMeta={activeProfileMeta}
          />

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
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
