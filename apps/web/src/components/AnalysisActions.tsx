import React from 'react';
import type { CVAnalysis } from '@shared/types';
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
}: AnalysisActionsProps) {
  return (
    <div className="analysisActions analysisActions--right">
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
  );
});
