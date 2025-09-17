import React from 'react';

export default function SortSelect(props: {
  sortBy: 'model' | 'recency';
  onChange: (v: 'model' | 'recency') => void;
}) {
  const { sortBy, onChange } = props;
  return (
    <div className="sortbar">
      <span className="sortbar__label">Sort by</span>
      <select
        value={sortBy}
        onChange={e => onChange(e.target.value as 'model' | 'recency')}
        className="sortbar__select"
      >
        <option value="model">Model score</option>
        <option value="recency">Recency</option>
      </select>
    </div>
  );
}
