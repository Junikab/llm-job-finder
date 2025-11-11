import React from 'react';

import type { CVAnalysis } from '@shared/types';

export type SearchUrlsAdvancedProps = {
  draft: CVAnalysis;
  onChangeDraft: (next: CVAnalysis) => void;
};

export function SearchUrlsAdvanced({ draft, onChangeDraft }: SearchUrlsAdvancedProps) {
  const d = draft;
  return (
    <details className="editLabel editLabelSpaced">
      <summary className="editLabelTitle">Search URLs (Advanced)</summary>
      <div className="editSectionSpacer">
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
  );
}
