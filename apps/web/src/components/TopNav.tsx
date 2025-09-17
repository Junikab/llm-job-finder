import React from 'react';

export default function TopNav(props: {
  tab: 'live' | 'saved';
  onChange: (tab: 'live' | 'saved') => void;
}) {
  const { tab, onChange } = props;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: '#2a62ff' }}>LLM Job Finder</div>
      <div style={{ display: 'flex', gap: 18, color: '#455', fontSize: 14 }}>
        <button
          type="button"
          onClick={() => onChange('live')}
          style={{ background: 'transparent', border: 'none', color: tab === 'live' ? '#2a62ff' : '#455', fontWeight: tab === 'live' ? 700 : 500, cursor: 'pointer' }}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => onChange('saved')}
          style={{ background: 'transparent', border: 'none', color: tab === 'saved' ? '#2a62ff' : '#455', fontWeight: tab === 'saved' ? 700 : 500, cursor: 'pointer' }}
        >
          Saved
        </button>
        <span style={{ color: '#455' }}>About</span>
      </div>
    </div>
  );
}
