import React from 'react';

export default function TabsHeader(props: {
  tab: 'live' | 'saved';
  onChange: (tab: 'live' | 'saved') => void;
}) {
  const { tab, onChange } = props;
  return (
    <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
      <button
        type="button"
        onClick={() => onChange('live')}
        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'live' ? '#111' : '#f7f7f7', color: tab === 'live' ? '#fff' : '#111' }}
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => onChange('saved')}
        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: tab === 'saved' ? '#111' : '#f7f7f7', color: tab === 'saved' ? '#fff' : '#111' }}
      >
        Saved
      </button>
    </div>
  );
}
