import React from 'react';

export type SavedFiltersProps = {
  sortBy: 'model' | 'user' | 'recency' | 'applied';
  onSortByChange: (v: 'model' | 'user' | 'recency' | 'applied') => void;
  appliedOnly: boolean;
  onAppliedOnlyChange: (v: boolean) => void;
  onClear: () => void;
  onReload: () => void | Promise<void>;
};

export default function SavedFilters(props: SavedFiltersProps) {
  const { sortBy, onSortByChange, appliedOnly, onAppliedOnlyChange, onClear, onReload } = props;
  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ color: '#333' }}>Sort by</span>
        <select value={sortBy} onChange={e => onSortByChange(e.target.value as any)}>
          <option value="model">Model score</option>
          <option value="user">Your score</option>
          <option value="recency">Recency</option>
          <option value="applied">Applied date (newest)</option>
        </select>
      </label>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="checkbox" checked={appliedOnly} onChange={e => onAppliedOnlyChange(e.target.checked)} />
        <span style={{ color: '#333' }}>Applied only</span>
      </label>
      <button type="button" onClick={onClear}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Clear</button>
      <button type="button" onClick={onReload}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>Reload</button>
    </div>
  );
}
