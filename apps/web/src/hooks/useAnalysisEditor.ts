import { useCallback, useState } from 'react';
import type { CVAnalysis, RankedJob, JobItem } from '@shared/types';
import { rescoreJobs } from '../api';
import { mapRankedToJobItem } from '../utils/jobMapping';

export function useAnalysisEditor({ analysis, onToast }: { analysis: CVAnalysis | null; onToast?: (msg: string) => void }) {
  const [draft, setDraft] = useState<CVAnalysis | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const startEdit = useCallback(() => {
    // If a draft already exists (e.g., loaded from ProfileControls), keep it.
    // Otherwise, initialize from current analysis.
    if (!draft && !analysis) return;
    setDraft(prev => prev ?? {
      summary: analysis?.summary || '',
      titles: [...(analysis?.titles || [])],
      topSkills: [...(analysis?.topSkills || [])],
      // location/worldwide are controlled on the landing form; keep any existing values for round-trip only
      locationHints: [...(analysis?.locationHints || [])],
      worldwide: !!analysis?.worldwide,
      manualSearchUrl: analysis?.manualSearchUrl || '',
    });
    setIsEditing(true);
  }, [analysis, draft]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
  }, []);

  const onChangeDraft = useCallback((next: CVAnalysis) => {
    setDraft(next);
  }, []);

  const handleRescore = useCallback(
    async (
      results: RankedJob[],
      opts: {
        onResults: (r: RankedJob[]) => void;
        onAnalysisCommitted?: (a: CVAnalysis) => void;
        onEditingDone?: () => void;
        onPromptUpdated?: (p: { user?: string; system?: string }) => void;
        onSearchUrlsUpdated?: (urls: string[]) => void;
        // Location control comes from landing (HeroSection)
        location?: string; // if provided, overrides search location
        worldwide?: boolean; // if true, overrides to worldwide (omit &l)
      }
    ) => {
      if (!draft) return;
      if (results.length === 0) {
        onToast?.('No results to rescore');
        return;
      }
      try {
        setRescoring(true);
        const jobs: JobItem[] = results.map(mapRankedToJobItem);
        const prevManual = (analysis?.manualSearchUrl || '').trim();
        const nextManual = (draft.manualSearchUrl || '').trim();
        const manualChanged = prevManual !== nextManual;
        const overrideFromLanding = (typeof opts.location === 'string') ? opts.location : (opts.worldwide ? '' : undefined);
        const resp = await rescoreJobs(
          draft,
          jobs,
          (manualChanged || typeof overrideFromLanding === 'string')
            ? {
                refreshSearch: true,
                searchUrl: nextManual || undefined,
                location: nextManual ? undefined : overrideFromLanding,
              }
            : undefined
        );
        opts.onResults(resp.results);
        opts.onAnalysisCommitted?.(draft);
        opts.onPromptUpdated?.({ user: resp.llmPromptUserPreview, system: resp.llmPromptSystem });
        if (resp.searchUrls && resp.searchUrls.length) {
          opts.onSearchUrlsUpdated?.(resp.searchUrls);
        }
        setIsEditing(false);
        onToast?.('Rescored');
      } catch (err) {
        console.error(err);
        onToast?.('Rescore failed');
      } finally {
        setRescoring(false);
        opts.onEditingDone?.();
      }
    },
    [draft, onToast, analysis]
  );

  return { draft, isEditing, rescoring, startEdit, cancelEdit, onChangeDraft, handleRescore } as const;
}
