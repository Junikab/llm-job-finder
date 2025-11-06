import React from 'react';
import '../styles/TabsHeader.css';

export default function TabsHeader(props: {
  tab: 'live' | 'saved';
  onChange: (tab: 'live' | 'saved') => void;
}) {
  const { tab, onChange } = props;
  return (
    <div className="tabsHeader">
      <button
        type="button"
        onClick={() => onChange('live')}
        className={`tabsHeader__btn ${tab === 'live' ? 'tabsHeader__btn--active' : ''}`}
      >
        Live
      </button>
      <button
        type="button"
        onClick={() => onChange('saved')}
        className={`tabsHeader__btn ${tab === 'saved' ? 'tabsHeader__btn--active' : ''}`}
      >
        Saved
      </button>
    </div>
  );
}
