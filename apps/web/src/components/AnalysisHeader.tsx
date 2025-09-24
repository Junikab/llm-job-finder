import React from 'react';
import '../styles/AnalysisHeader.css';
import type { CVAnalysis } from '@shared/types';
import { ProfileControls } from './ProfileControls';
import { AnalysisDetails } from './AnalysisDetails';

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
}) {
  if (!analysis) return null;

  const promptHeader = (llmPromptUserPreview && llmPromptUserPreview.trim().length > 0)
    ? llmPromptUserPreview
    : 'Prompt preview unavailable.';

  // Show first 5 lines by default; allow expanding to full prompt
  const [showFullPrompt, setShowFullPrompt] = React.useState(false);
  const previewLineLimit = 5;
  const promptLines = promptHeader.split('\n');
  const isTruncatable = promptLines.length > previewLineLimit;
  const visiblePrompt = showFullPrompt ? promptHeader : promptLines.slice(0, previewLineLimit).join('\n');

  const d = draft || analysis;

  // Active profile indicator (set when a profile is loaded via ProfileControls)
  const [activeProfileMeta, setActiveProfileMeta] = React.useState<{ id: string; label: string | null } | null>(null);
  const PROFILE_META_KEY = 'activeProfileMeta:v1';

  // Restore last-used profile meta on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_META_KEY);
      if (raw) {
        const meta = JSON.parse(raw) as { id: string; label: string | null };
        if (meta && typeof meta.id === 'string') {
          setActiveProfileMeta({ id: meta.id, label: meta.label ?? null });
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 

  return (
    <div className="analysisCard">
      {activeProfileMeta && (
        <div className="profileLine">
          <strong>Profile: </strong> {activeProfileMeta.label || activeProfileMeta.id}
        </div>
      )}
      <div className="analysisHeaderRow">
        <strong>LLM prompt {llmPromptUserPreview ? '(exact preview)' : 'header'}:</strong>
        {!isEditing ? (
          <button type="button" onClick={onStartEdit}>Edit analysis</button>
        ) : (
          <div className="analysisHeaderRow">
            <button type="button" onClick={onCancelEdit} disabled={rescoring}>Cancel</button>
            <button type="button" onClick={onRescore} disabled={rescoring} className="btnBold">
              {rescoring ? 'Rescoring…' : 'Rescore'}
            </button>
            {/* Minimal Save/Load profile controls extracted to a reusable component */}
            <ProfileControls
              draft={d}
              isEditing={isEditing}
              onApplyProfile={(a) => onChangeDraft({ ...a })}
              onProfileLoadMeta={(meta) => {
                setActiveProfileMeta(meta);
                try { localStorage.setItem(PROFILE_META_KEY, JSON.stringify(meta)); } catch {}
              }}
            />
          </div>
        )}
      </div>
      {llmPromptSystem && (
        <pre className="systemPre">{llmPromptSystem}</pre>
      )}
      <div className="promptContainer">
        <pre id="llm-prompt-preview" className="promptPre">{visiblePrompt}</pre>
        {isTruncatable && !showFullPrompt && (
          <div className="fadeOverlay" aria-hidden="true" />
        )}
        {isTruncatable && (
          <button
            type="button"
            className="toggleButton"
            onClick={() => setShowFullPrompt(v => !v)}
            aria-expanded={showFullPrompt}
            aria-controls="llm-prompt-preview"
          >
            {showFullPrompt ? 'Read less' : 'Read more'}
          </button>
        )}
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
