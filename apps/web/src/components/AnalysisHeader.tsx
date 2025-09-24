import React from 'react';
import '../styles/AnalysisHeader.css';
import type { CVAnalysis } from '@shared/types';
import { ProfileControls } from './ProfileControls';

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

  const toList = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : '');
  const fromList = (s: string): string[] => Array.from(new Set(s.split(',').map(x => x.trim()).filter(Boolean)));

  return (
    <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      {activeProfileMeta && (
        <div style={{ marginBottom: 6, color: '#334155' }}>
          <strong>Profile label:</strong> {activeProfileMeta.label || activeProfileMeta.id}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong>LLM prompt {llmPromptUserPreview ? '(exact preview)' : 'header'}:</strong>
        {!isEditing ? (
          <button type="button" onClick={onStartEdit}>Edit analysis</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={onCancelEdit} disabled={rescoring}>Cancel</button>
            <button type="button" onClick={onRescore} disabled={rescoring} style={{ fontWeight: 600 }}>
              {rescoring ? 'Rescoring…' : 'Rescore'}
            </button>
            {/* Minimal Save/Load profile controls extracted to a reusable component */}
            <ProfileControls
              draft={d}
              isEditing={isEditing}
              onApplyProfile={(a) => onChangeDraft({ ...a })}
              onProfileLoadMeta={(meta) => setActiveProfileMeta(meta)}
            />
          </div>
        )}
      </div>
      {llmPromptSystem && (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, marginTop: 6, padding: 10, background: '#f1f5f9', borderRadius: 8, border: '1px solid #eee', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#111' }}>{llmPromptSystem}</pre>
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

      {!isEditing ? (
        <>
          {analysis.titles?.length ? (
            <div style={{ marginTop: 6, color: '#555' }}><strong>Titles:</strong> {analysis.titles.join(', ')}</div>
          ) : null}
          {analysis.topSkills?.length ? (
            <div style={{ marginTop: 6, color: '#555' }}><strong>Top skills:</strong> {analysis.topSkills.join(', ')}</div>
          ) : null}
          {analysis.locationHints?.length ? (
            <div style={{ marginTop: 6, color: '#555' }}><strong>Location hints:</strong> {analysis.locationHints.join(', ')}</div>
          ) : null}
        </>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Summary</span>
            <textarea
              value={d.summary || ''}
              onChange={e => onChangeDraft({ ...d, summary: e.target.value })}
              rows={4}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Titles (comma-separated)</span>
            <input
              type="text"
              value={toList(d.titles)}
              onChange={e => onChangeDraft({ ...d, titles: fromList(e.target.value) })}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Top skills (comma-separated)</span>
            <input
              type="text"
              value={toList(d.topSkills)}
              onChange={e => onChangeDraft({ ...d, topSkills: fromList(e.target.value) })}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Location hints (comma-separated)</span>
            <input
              type="text"
              value={toList(d.locationHints)}
              onChange={e => onChangeDraft({ ...d, locationHints: fromList(e.target.value) })}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </label>
        </div>
      )}

      {!!(searchUrls?.length) && (
        <div style={{ marginTop: 8 }}>
          <strong>Search URLs:</strong> {searchUrls.map((u: string) => {
            try {
              const q = new URL(u).searchParams.get('q') || u;
              return (<a key={u} href={u} target="_blank" style={{ marginLeft: 8 }}>{q}</a>);
            } catch {
              return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
