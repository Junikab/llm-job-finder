import React from 'react';

import '../styles/AnalysisHeader.css';
import { useCandidatePreview } from '../hooks/useCandidatePreview';

import { AnalysisActions } from './AnalysisActions';
import { AnalysisDetails } from './AnalysisDetails';
import { SearchUrlsAdvanced } from './SearchUrlsAdvanced';

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
  const [showSearchInfo, setShowSearchInfo] = React.useState(false);
  const infoRef = React.useRef<HTMLSpanElement | null>(null);

  React.useEffect(() => {
    function onDocPointer(e: Event) {
      if (!showSearchInfo) return;
      const t = e.target as Node | null;
      if (infoRef.current && t && !infoRef.current.contains(t)) {
        setShowSearchInfo(false);
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
    };
  }, [showSearchInfo]);
 

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
          <span className="linksRow__infoWrap" ref={infoRef}>
            <button
              type="button"
              className="infoBubbleBtn"
              aria-label="About search URLs"
              aria-expanded={showSearchInfo}
              aria-controls="search-url-info"
              onClick={() => setShowSearchInfo(v => !v)}
            >
              i
            </button>
            {showSearchInfo && (
              <div id="search-url-info" className="infoBubble" role="dialog">
                We build these from your CV titles/skills and chosen location. You can paste your own Jora search URL via “Edit analysis” → “Search URLs (Advanced)”.
              </div>
            )}
          </span>
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
