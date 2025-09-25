import React from 'react';
import '../styles/AnalysisHeader.css';
import type { CVAnalysis } from '@shared/types';
import { AnalysisDetails } from './AnalysisDetails';
import { AnalysisActions } from './AnalysisActions';
import { useCandidatePreview } from '../hooks/useCandidatePreview';

/**
 * AnalysisHeader
 * - Shows the candidate-only prompt preview
 * - Displays and edits analysis details via AnalysisDetails
 * - Hosts action controls via AnalysisActions
 */
export default function AnalysisHeader({
  analysis,
  searchUrls,
  llmGoodTraits,
  llmBadTraits,
  llmPromptUserPreview,
  llmPromptSystem,
  draft,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onChangeDraft,
  onRescore,
  rescoring,
  activeProfileMeta,
}: {
  analysis: CVAnalysis | null;
  searchUrls: string[];
  llmGoodTraits?: string;
  llmBadTraits?: string;
  llmPromptUserPreview?: string;
  llmPromptSystem?: string;
  draft: CVAnalysis | null;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (next: CVAnalysis) => void;
  onRescore: () => void;
  rescoring: boolean;
  activeProfileMeta?: { id: string; label: string | null } | null;
}) {
  if (!analysis) return null;

  const d = draft || analysis;
  const candidatePreview = useCandidatePreview({ analysis, draft, userPreview: llmPromptUserPreview, llmGoodTraits, llmBadTraits });
 

  return (
    <div className="analysisCard">
      {activeProfileMeta && (
        <div className="profileLine">
          <strong>Profile: </strong> {activeProfileMeta.label || activeProfileMeta.id}
        </div>
      )}
      <div className="analysisHeaderRow">
        <strong>LLM prompt (candidate section):</strong>
        <AnalysisActions
          isEditing={isEditing}
          rescoring={rescoring}
          draft={d}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onRescore={onRescore}
          onChangeDraft={onChangeDraft}
        />
      </div>
      {/* System prompt hidden intentionally to show only the <candidate> section */}
      <div className="promptContainer">
        <pre id="llm-prompt-preview" className="promptPre">{candidatePreview}</pre>
      </div>

      <AnalysisDetails analysis={analysis} draft={d} isEditing={isEditing} onChangeDraft={onChangeDraft} />

      {!!(searchUrls?.length) && (
        <div className="linksRow">
          <strong>Search URLs:</strong> {searchUrls.map((u: string) => {
            try {
              const q = new URL(u).searchParams.get('q') || u;
              return (<a key={u} href={u} target="_blank" rel="noopener noreferrer">{q}</a>);
            } catch {
              return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
