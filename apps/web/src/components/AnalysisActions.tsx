import React from 'react';
import type { CVAnalysis } from '@shared/types';
import { ProfileControls } from './ProfileControls';
import '../styles/AnalysisActions.css';

export type AnalysisActionsProps = {
  isEditing: boolean;
  rescoring: boolean;
  draft: CVAnalysis;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRescore: () => void;
  onChangeDraft: (next: CVAnalysis) => void;
  onProfileLoadMeta: (meta: { id: string; label: string | null }) => void;
};

export function AnalysisActions({
  isEditing,
  rescoring,
  draft,
  onStartEdit,
  onCancelEdit,
  onRescore,
  onChangeDraft,
  onProfileLoadMeta,
}: AnalysisActionsProps) {
  if (!isEditing) {
    return (
      <div className="analysisActions">
        <button type="button" onClick={onStartEdit} className="btn btnSecondary">Edit analysis</button>
      </div>
    );
  }

  return (
    <div className="analysisActions">
      <button type="button" onClick={onCancelEdit} disabled={rescoring} className="btn btnSecondary">Cancel</button>
      <button type="button" onClick={onRescore} disabled={rescoring} className="btn btnPrimary btnBold">
        {rescoring ? 'Rescoring…' : 'Rescore'}
      </button>
      <ProfileControls
        draft={draft}
        isEditing={true}
        onApplyProfile={(a) => onChangeDraft({ ...a })}
        onProfileLoadMeta={onProfileLoadMeta}
      />
    </div>
  );
}
