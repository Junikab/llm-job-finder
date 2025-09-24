import React from 'react';
import '../styles/AnalysisHeader.css';
import type { CVAnalysis } from '@shared/types';
import { AnalysisDetails } from './AnalysisDetails';
import { AnalysisActions } from './AnalysisActions';

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

  const d = draft || analysis;

  // Only show the <candidate> section of the prompt (what the user can edit)
  function extractCandidateSectionBlock(s?: string | null): string | null {
    if (!s) return null;
    const startTag = '<candidate>';
    const endTag = '</candidate>';
    const start = s.indexOf(startTag);
    const end = s.indexOf(endTag);
    if (start !== -1 && end !== -1 && end > start) {
      return s.slice(start + startTag.length, end).trim();
    }
    return null;
  }

  function buildCandidatePreview(a: CVAnalysis, good?: string, bad?: string): string {
    const lines: string[] = [];
    lines.push('Candidate profile (CV summary):');
    const summary = (a.summary || '').trim();
    lines.push(summary.length > 0 ? summary : '(empty)');
    lines.push('');
    lines.push('Structured profile hints (optional):');
    if (Array.isArray(a.titles) && a.titles.length) lines.push(`Titles: ${a.titles.join(', ')}`);
    if (Array.isArray(a.topSkills) && a.topSkills.length) lines.push(`Top skills: ${a.topSkills.join(', ')}`);
    if (Array.isArray(a.locationHints) && a.locationHints.length) lines.push(`Location hints: ${a.locationHints.join(', ')}`);
    const goodT = (llmGoodTraits || good || '').trim();
    const badT = (llmBadTraits || bad || '').trim();
    if (goodT || badT) {
      lines.push('', 'Compact prompt customization (optional):');
      if (goodT) lines.push(`Good traits: ${goodT}`);
      if (badT) lines.push(`Bad traits: ${badT}`);
    }
    return lines.join('\n');
  }

  const candidateFromPreview = extractCandidateSectionBlock(llmPromptUserPreview);
  const candidatePreview = candidateFromPreview || buildCandidatePreview(d, llmGoodTraits, llmBadTraits);

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
        <strong>LLM prompt (candidate section):</strong>
        <AnalysisActions
          isEditing={isEditing}
          rescoring={rescoring}
          draft={d}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onRescore={onRescore}
          onChangeDraft={onChangeDraft}
          onProfileLoadMeta={(meta) => {
            setActiveProfileMeta(meta);
            try { localStorage.setItem(PROFILE_META_KEY, JSON.stringify(meta)); } catch {}
          }}
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
