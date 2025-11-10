import { useMemo } from 'react';

import type { CVAnalysis } from '@shared/types';

export type CandidatePreviewParams = {
  analysis: CVAnalysis;
  draft?: CVAnalysis | null;
  userPreview?: string | null; // kept for backwards-compat; currently unused
  llmGoodTraits?: string;
  llmBadTraits?: string;
};

/**
 * Build a UI-friendly preview that includes ONLY the <candidate> section of the
 * LLM prompt. If an exact user preview is provided (llmPromptUserPreview), we
 * extract the <candidate>...</candidate> block. Otherwise we reconstruct it
 * from the current draft (or analysis fallback), including optional traits.
 */
export function useCandidatePreview({ analysis, draft, userPreview: _userPreview, llmGoodTraits, llmBadTraits }: CandidatePreviewParams): string {
  return useMemo(() => {
    const d: CVAnalysis = (draft || analysis);

    function buildCandidatePreview(a: CVAnalysis, good?: string, bad?: string): string {
      const lines: string[] = [];
      lines.push('Candidate profile (CV summary):');
      const summary = (a.summary || '').trim();
      lines.push(summary.length > 0 ? summary : '(empty)');
      lines.push('');
      lines.push('Structured profile hints (optional):');
      if (Array.isArray(a.titles) && a.titles.length) lines.push(`Titles: ${a.titles.join(', ')}`);
      if (Array.isArray(a.topSkills) && a.topSkills.length) lines.push(`Top skills: ${a.topSkills.join(', ')}`);
      const goodT = (llmGoodTraits || good || '').trim();
      const badT = (llmBadTraits || bad || '').trim();
      if (goodT || badT) {
        lines.push('', 'Compact prompt customization (optional):');
        if (goodT) lines.push(`Good traits: ${goodT}`);
        if (badT) lines.push(`Bad traits: ${badT}`);
      }
      return lines.join('\n');
    }

    // Always build from the current draft/analysis so UI reflects immediate changes
    // like loading a profile, without requiring a rescore.
    return buildCandidatePreview(d, llmGoodTraits, llmBadTraits);
  }, [analysis, draft, llmGoodTraits, llmBadTraits]);
}
