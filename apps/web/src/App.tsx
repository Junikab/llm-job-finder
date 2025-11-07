import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findJobs } from './api';
import type { RankedJob, CVAnalysis } from '@shared/types';
import LivePage from './pages/LivePage';
import SavedPage from './pages/SavedPage';
import { useSavedJobs } from './hooks/useSavedJobs';
import TopNav from './components/TopNav';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';
import { useAnalysisEditor } from './hooks/useAnalysisEditor';
import { useActiveProfileMeta } from './hooks/useActiveProfileMeta';
import AboutPage from './pages/AboutPage';

export default function App() {
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
  const [page, setPage] = useState<'about' | 'live' | 'saved'>(() => {
    if (typeof window === 'undefined') return 'about';
    const p = window.location.pathname;
    if (p.startsWith('/live')) return 'live';
    if (p.startsWith('/saved')) return 'saved';
    return 'about';
  });
  // Toast
  const { toast, showToast } = useToast(1600);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const findCtlRef = useRef<AbortController | null>(null);

  const navigatePage = useCallback((nextPage: 'about' | 'live' | 'saved') => {
    setPage(nextPage);
    if (typeof window === 'undefined') {
      return;
    }
    const targetPath = nextPage === 'about' ? '/about' : (nextPage === 'live' ? '/live' : '/saved');
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: nextPage }, '', targetPath);
    }
  }, []);

  // Ensure first landing uses a known route and sync page state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = window.location.pathname;
    if (p.startsWith('/about')) setPage('about');
    else if (p.startsWith('/live')) setPage('live');
    else if (p.startsWith('/saved')) setPage('saved');
    else navigatePage('about');
  }, [navigatePage]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.startsWith('/about')) setPage('about');
      else if (p.startsWith('/live')) setPage('live');
      else if (p.startsWith('/saved')) setPage('saved');
      else setPage('about');
    }; 
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (findCtlRef.current) {
        findCtlRef.current.abort();
        findCtlRef.current = null;
      }
    };
  }, []);

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

  // Landing location controls
  const [location, setLocation] = useState<string>('');
  const [worldwide, setWorldwide] = useState<boolean>(false);

  // Saved jobs via hook
  const { saved, savedLoading, savedError, refreshSaved: handleRefreshSaved, rate: handleRate } = useSavedJobs((msg) => showToast(msg));

  // Enable submit only when CV is selected AND (location provided OR worldwide), and not loading
  const canSubmit = useMemo(() => {
    const hasFile = !!file;
    const hasLocation = worldwide || ((location || '').trim().length > 0);
    return hasFile && hasLocation && !loading;
  }, [file, location, worldwide, loading]);

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
    // Gentle validation for location/worldwide
    const loc = (location || '').trim();
    if (!worldwide && !loc) {
      setError('Location or "Any" is required');
      return;
    }
    if (loading) return;
    // abort previous find if any
    if (findCtlRef.current) findCtlRef.current.abort();
    const ctl = new AbortController();
    findCtlRef.current = ctl;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const form = new FormData();
      // Important: append location BEFORE file so server's req.file().fields sees it reliably
      if (worldwide) {
        form.append('location', ''); // server treats empty as worldwide
      } else {
        form.append('location', loc);
      }
      form.append('cv', file);

      const json = await findJobs(form, ctl.signal);
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
      if (findCtlRef.current === ctl) findCtlRef.current = null;
      setLoading(false);
    }
  }, [file, loading, location, worldwide]);

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
      // Centralized location control from landing
      location: worldwide ? '' : ((location || '').trim()),
      worldwide,
    });
  }, [handleRescore, results, location, worldwide]);

  // Recent CVs removed – no extra effects needed

  // Saved jobs handlers come from useSavedJobs

  return (
    <div className="app-root">
      {/* Simple navbar */}
      <TopNav
        currentPage={page}
        onNavigatePage={(nextPage) => {
          navigatePage(nextPage);
          if (nextPage === 'about' || nextPage === 'live') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

      {page === 'about' ? (
        <AboutPage
          onNavigateHome={() => {
            navigatePage('live');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <>
          {page === 'live' && (
            <LivePage
              results={results}
              loading={loading}
              sortBy={sortBy}
              onChangeSortBy={setSortBy}
              error={error}
              onSubmit={onSubmit}
              onFileChange={onFileChange}
              location={location}
              worldwide={worldwide}
              onChangeLocation={setLocation}
              onChangeWorldwide={setWorldwide}
              canSubmit={canSubmit}
              fileInputRef={fileInputRef}
              draftAnalysis={draftAnalysis}
              analysis={analysis}
              isEditingAnalysis={isEditingAnalysis}
              onApplyProfile={(a) => onChangeDraft({ ...a })}
              onProfileLoadMeta={(meta) => setActiveProfileMeta(meta)}
              searchUrls={searchUrls}
              llmGoodTraits={llmGoodTraits}
              llmBadTraits={llmBadTraits}
              llmPromptUserPreview={llmPromptUserPreview}
              llmPromptSystem={llmPromptSystem}
              onStartEdit={startEditAnalysis}
              onCancelEdit={cancelEditAnalysis}
              onChangeDraft={onChangeDraft}
              onRescore={onRescore}
              rescoring={rescoring}
              activeProfileMeta={activeProfileMeta}
            />
          )}

          {page === 'saved' && (
            <SavedPage
              saved={saved}
              loading={savedLoading}
              error={savedError}
              onRefresh={handleRefreshSaved}
              onRate={handleRate}
              onGoLive={() => {
                navigatePage('live');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
      <Toast message={toast} />
    </div>
  );
}
