import React from 'react';

import { findJobs } from '../api';

import type { CVAnalysis, RankedJob } from '@shared/types';

export function useFindJobsController(params: {
  file: File | null;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setResults: React.Dispatch<React.SetStateAction<RankedJob[]>>;
  location: string;
  worldwide: boolean;
  showToast: (msg: string) => void;
  cancelEditAnalysis: () => void;
  setAnalysis: (v: CVAnalysis | null) => void;
  setSearchUrls: (v: string[]) => void;
  setLlmGoodTraits: (v: string) => void;
  setLlmBadTraits: (v: string) => void;
  setLlmPromptUserPreview: (v: string | undefined) => void;
  setLlmPromptSystem: (v: string | undefined) => void;
}) {
  const {
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
  } = params;

  const ctlRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      if (ctlRef.current) {
        ctlRef.current.abort();
        ctlRef.current = null;
      }
    };
  }, []);

  const onSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast('Please upload CV or choose from recent CVs');
      return;
    }
    const loc = (location || '').trim();
    if (!worldwide && !loc) {
      setError('Location or "Any" is required');
      return;
    }
    if (loading) return;

    if (ctlRef.current) ctlRef.current.abort();
    const ctl = new AbortController();
    ctlRef.current = ctl;
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
      cancelEditAnalysis();
    } catch (err: unknown) {
      console.error(err);
      let msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (/Request failed:\s*500/.test(msg)) {
        msg = 'Server error: the scraper is not ready. In development, run: npx playwright install chromium. If it still fails on Linux, run: npx playwright install-deps chromium, then retry.';
      }
      setError(msg);
    } finally {
      if (ctlRef.current === ctl) ctlRef.current = null;
      setLoading(false);
    }
  }, [file, location, worldwide, loading, showToast, setError, setLoading, setResults, setAnalysis, setSearchUrls, setLlmGoodTraits, setLlmBadTraits, setLlmPromptUserPreview, setLlmPromptSystem, cancelEditAnalysis]);

  return { onSubmit } as const;
}
