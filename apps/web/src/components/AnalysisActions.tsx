import React from 'react';
import type { CVAnalysis } from '@shared/types';
import { ProfileControls } from './ProfileControls';
import '../styles/AnalysisActions.css';

/**
 * Props for AnalysisActions.
 * Contains edit state, callbacks, and the current draft analysis.
 */
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

/**
 * Action bar for the Analysis section.
 * - View mode: shows a single "Edit analysis" button aligned to the right.
 * - Edit mode: shows ProfileControls, Cancel, and Rescore buttons.
 */
export const AnalysisActions = React.memo(function AnalysisActionsComponent({
  isEditing,
  rescoring,
  draft,
  onStartEdit,
  onCancelEdit,
  onRescore,
  onChangeDraft,
  onProfileLoadMeta,
}: AnalysisActionsProps) {
  return (
    <div className="analysisActions">
      <div className="analysisActions__left">
        <ProfileControls
          draft={draft}
          isEditing={isEditing}
          onApplyProfile={(a) => onChangeDraft({ ...a })}
          onProfileLoadMeta={onProfileLoadMeta}
        />
      </div>
      <div className="analysisActions__right">
        {!isEditing ? (
          <button type="button" onClick={onStartEdit} className="btn btnSecondary">Edit analysis</button>
        ) : (
          <>
            <button type="button" onClick={onCancelEdit} disabled={rescoring} className="btn btnSecondary">Cancel edits</button>
            <button type="button" onClick={onRescore} disabled={rescoring} className="btn btnPrimary btnBold">
              {rescoring ? 'Rescoring…' : 'Rescore'}
            </button>
          </>
        )}
      </div>
    </div>
  );
});
