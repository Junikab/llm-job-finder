import React from 'react';
import type { CVAnalysis } from '@shared/types';
import '../styles/AnalysisHeader.css';

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
 * - Not editing: shows Titles, Top skills, and Location hints from the current analysis
 * - Editing: shows inputs bound to the provided draft, emitting changes via onChangeDraft
 */
export function AnalysisDetails({ analysis, draft, isEditing, onChangeDraft }: AnalysisDetailsProps) {
  if (!isEditing) {
    return (
      <>
        {analysis.titles?.length ? (
          <div className="infoLine"><strong>Titles:</strong> {analysis.titles.join(', ')}</div>
        ) : null}
        {analysis.topSkills?.length ? (
          <div className="infoLine"><strong>Top skills:</strong> {analysis.topSkills.join(', ')}</div>
        ) : null}
        {analysis.locationHints?.length ? (
          <div className="infoLine"><strong>Location hints:</strong> {analysis.locationHints.join(', ')}</div>
        ) : null}
      </>
    );
  }

  const d = draft;

  return (
    <div className="editGrid">
      <label className="editLabel">
        <span className="editLabelTitle">Summary</span>
        <textarea
          value={d.summary || ''}
          onChange={e => onChangeDraft({ ...d, summary: e.target.value })}
          rows={4}
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
      <label className="editLabel">
        <span className="editLabelTitle">Location hints (comma-separated)</span>
        <input
          type="text"
          value={toList(d.locationHints)}
          onChange={e => onChangeDraft({ ...d, locationHints: fromList(e.target.value) })}
          className="editInput"
        />
      </label>
    </div>
  );
}
