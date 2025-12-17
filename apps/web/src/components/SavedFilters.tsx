import React from 'react';
import '../styles/SavedPage.css';

export type SavedFiltersProps = {
  sortBy: 'model' | 'user' | 'recency' | 'applied';
  onSortByChange: (v: 'model' | 'user' | 'recency' | 'applied') => void;
  query: string;
  onQueryChange: (v: string) => void;
  appliedOnly: boolean;
  onAppliedOnlyChange: (v: boolean) => void;
  savedOnly: boolean;
  onSavedOnlyChange: (v: boolean) => void;
  onClear: () => void;
  onRefresh: () => void | Promise<void>;
};

export default function SavedFilters(props: SavedFiltersProps) {
  const { sortBy, onSortByChange, query, onQueryChange, appliedOnly, onAppliedOnlyChange, savedOnly, onSavedOnlyChange, onClear, onRefresh } = props;
  return (
    <div className="savedFilters">
      <label className="savedFilters__label">
        <span className="savedFilters__text">Search</span>
        <input
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="title, company, location"
          className="editInput savedFilters__input"
        />
      </label>
      <label className="savedFilters__label">
        <span className="savedFilters__text">Sort by</span>
        <select value={sortBy} onChange={e => onSortByChange(e.target.value as 'model' | 'user' | 'recency' | 'applied')}>
          <option value="model">Model score</option>
          <option value="user">Your score</option>
          <option value="recency">Recency</option>
          <option value="applied">Applied date (newest)</option>
        </select>
      </label>
      <label className="savedFilters__label">
        <input type="checkbox" checked={appliedOnly} onChange={e => onAppliedOnlyChange(e.target.checked)} />
        <span className="savedFilters__text">Applied only</span>
      </label>
      <label className="savedFilters__label">
        <input type="checkbox" checked={savedOnly} onChange={e => onSavedOnlyChange(e.target.checked)} />
        <span className="savedFilters__text">Saved only</span>
      </label>
      <button type="button" onClick={onClear} className="savedFilters__btnClear">Clear</button>
      <button type="button" onClick={onRefresh} className="savedCta">Refresh</button>
    </div>
  );
}
