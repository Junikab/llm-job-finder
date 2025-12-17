import React from 'react';
import '../styles/SavedPage.css';

export type SavedEmptyStateProps = {
  onGoLive: () => void;
};

export function SavedEmptyState({ onGoLive }: SavedEmptyStateProps) {
  return (
    <div className="savedPage__empty">
      <h3 className="savedPage__emptyTitle">No saved jobs yet.</h3>
      <p className="savedPage__emptyText">Save jobs from Live to track them here.</p>
      <button type="button" onClick={onGoLive} className="savedCta">Find jobs</button>
    </div>
  );
}
