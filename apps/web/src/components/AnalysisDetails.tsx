import React from 'react';
import type { CVAnalysis } from '@shared/types';
import '../styles/AnalysisHeader.css';

/**
 * Props for AnalysisDetails.
 * - analysis: the committed analysis to display when not editing
 * - draft: the working copy bound to inputs while editing
 * - isEditing: toggles between view and edit modes
 * - onChangeDraft: emits updated draft objects using immutable updates
 */
export type AnalysisDetailsProps = {
  analysis: CVAnalysis;
  draft: CVAnalysis;
  isEditing: boolean;
  onChangeDraft: (next: CVAnalysis) => void;
};

function toList(arr?: readonly string[]): string {
  return arr && arr.length ? arr.join(', ') : '';
}

function fromList(s: string): string[] {
  return Array.from(new Set(s.split(',').map(x => x.trim()).filter(Boolean)));
}

/**
 * View/Edit block for CV analysis details.
 * - View mode: hidden (the <candidate> preview shows this info already)
 * - Edit mode: shows inputs bound to the provided draft, emitting changes via onChangeDraft
 */
export const AnalysisDetails = React.memo(function AnalysisDetailsComponent({ analysis, draft, isEditing, onChangeDraft }: AnalysisDetailsProps) {
  if (!isEditing) {
    // In view mode, the <candidate> block already shows summary and hints.
    // Hide these duplicate fields until the user enters edit mode.
    return null;
  }

  const d = draft;

  return (
    <div className="editGrid">
      <label className="editLabel">
        <span className="editLabelTitle">Summary</span>
        <textarea
          value={d.summary || ''}
          onChange={e => onChangeDraft({ ...d, summary: e.target.value })}
          rows={10}
          className="editTextarea"
        />
      </label>
      <label className="editLabel">
        <span className="editLabelTitle">Titles (comma-separated)</span>
        <input
          type="text"
          value={toList(d.titles)}
          onChange={e => onChangeDraft({ ...d, titles: fromList(e.target.value) })}
          className="editInput"
        />
      </label>
      <label className="editLabel">
        <span className="editLabelTitle">Top skills (comma-separated)</span>
        <input
          type="text"
          value={toList(d.topSkills)}
          onChange={e => onChangeDraft({ ...d, topSkills: fromList(e.target.value) })}
          className="editInput"
        />
      </label>
      {/* Location is controlled on the landing form (Hero section). */}

      <details className="editLabel" style={{ marginTop: 8 }}>
        <summary className="editLabelTitle">Search URLs (Advanced)</summary>
        <div style={{ marginTop: 8 }}>
          <label className="editLabel">
            <span className="editLabelTitle">Manual URL (optional)</span>
            <input
              type="text"
              value={d.manualSearchUrl || ''}
              onChange={e => onChangeDraft({ ...d, manualSearchUrl: e.target.value })}
              className="editInput"
              placeholder="https://au.jora.com/j?q=..."
            />
          </label>
        </div>
      </details>
    </div>
  );
});
