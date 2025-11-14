import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Toast from './components/Toast';
import TopNav from './components/TopNav';
import { useActiveProfileMeta } from './hooks/useActiveProfileMeta';
import { useAnalysisEditor } from './hooks/useAnalysisEditor';
import { useSavedJobs } from './hooks/useSavedJobs';
import { useToast } from './hooks/useToast';
import { usePageRouter } from './hooks/usePageRouter';
import { useLiveCache } from './hooks/useLiveCache';
import { useLandingForm } from './hooks/useLandingForm';
import { useFindJobsController } from './hooks/useFindJobsController';
import AboutPage from './pages/AboutPage';
import LivePage from './pages/LivePage';
import SavedPage from './pages/SavedPage';

import type { CVAnalysis, RankedJob } from '@shared/types';

export function App() {
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
  const { page, navigatePage } = usePageRouter();
  // Toast
  const { toast, showToast } = useToast(1600);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Landing form state (file, location, worldwide)
  const {
    file,
    location,
    worldwide,
    setLocation,
    setWorldwide,
    canSubmit: formCanSubmit,
    onFileChange,
  } = useLandingForm();

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

  // Compute submit availability (respect loading)
  const canSubmit = useMemo(() => formCanSubmit && !loading, [formCanSubmit, loading]);

  // Saved jobs via hook
  const { saved, savedLoading, savedError, refreshSaved: handleRefreshSaved, rate: handleRate } = useSavedJobs((msg) => showToast(msg));

  // Find controller (submits form and updates state)
  const { onSubmit } = useFindJobsController({
    file,
    loading,
    setLoading,
    setError,
    setResults,
    location,
    worldwide,
    showToast,
    cancelEditAnalysis,
    setAnalysis,
    setSearchUrls,
    setLlmGoodTraits,
    setLlmBadTraits,
    setLlmPromptUserPreview,
    setLlmPromptSystem,
  });

  // Persist latest live results in localStorage so they survive page refreshes
  const { restoreLatest, persistLatest } = useLiveCache();

  // On first load, restore last successful results if present
  useEffect(() => {
    const cached = restoreLatest();
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
  }, [restoreLatest]);

  // After a successful fetch (not during loading) persist the latest results snapshot
  useEffect(() => {
    if (!loading && results.length > 0) {
      persistLatest({ analysis: analysis ?? undefined, searchUrls, results, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem });
    }
  }, [loading, analysis, searchUrls, results, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem, persistLatest]);

  

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
