import React from 'react';

export default function SortSelect(props: {
  sortBy: 'model' | 'recency';
  onChange: (v: 'model' | 'recency') => void;
}) {
  const { sortBy, onChange } = props;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
      <span style={{ color: '#334155' }}>Sort by</span>
      <select
        value={sortBy}
        onChange={e => onChange(e.target.value as 'model' | 'recency')}
        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
      >
        <option value="model">Model score</option>
        <option value="recency">Recency</option>
      </select>
    </div>
  );
}
