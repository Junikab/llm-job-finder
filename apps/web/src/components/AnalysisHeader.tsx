import React from 'react';

import '../styles/AnalysisHeader.css';
import { useCandidatePreview } from '../hooks/useCandidatePreview';

import { AnalysisActions } from './AnalysisActions';
import { AnalysisDetails } from './AnalysisDetails';
import { SearchUrlsAdvanced } from './SearchUrlsAdvanced';
import { InfoBubble } from './InfoBubble';

import type { CVAnalysis } from '@shared/types';


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
  llmPromptSystem: _llmPromptSystem,
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
  // Always call hooks unconditionally to satisfy React rules-of-hooks
  const safeAnalysis: CVAnalysis = analysis ?? { summary: '', titles: [], topSkills: [] };
  const candidatePreview = useCandidatePreview({ analysis: safeAnalysis, draft, userPreview: llmPromptUserPreview, llmGoodTraits, llmBadTraits });

  if (!analysis) return null;

  const d = draft || analysis;
 

  return (
    <div className="analysisCard">
      <div className="profileLine">
        <strong>Profile name: </strong> {(activeProfileMeta?.label || activeProfileMeta?.id || '')}
      </div>
      <div className="analysisHeaderRow">
        <div>
          <InfoBubble ariaLabel="About candidate prompt" bubbleId="llm-prompt-info">
            This is the LLM prompt used to score jobs. You can edit it via “Edit analysis” to influence results.
          </InfoBubble>
          <strong>LLM prompt (candidate section):</strong>
        </div>
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
          <InfoBubble ariaLabel="About search URLs" bubbleId="search-url-info">
            We build these from your CV titles/skills and chosen location. You can paste your own Jora search URL via “Edit analysis” → “Search URLs (Advanced)”.
          </InfoBubble>
          <strong>Search URLs:</strong>
          {searchUrls.map((u: string) => {
            try {
              const q = new URL(u).searchParams.get('q') || u;
              return (<a key={u} href={u} target="_blank" rel="noopener noreferrer">{q}</a>);
            } catch {
              return null;
            }
          })}
        </div>
      )}

      {isEditing && (
        <div className="editSectionSpacer">
          <SearchUrlsAdvanced draft={d} onChangeDraft={onChangeDraft} />
        </div>
      )}
    </div>
  );
}
