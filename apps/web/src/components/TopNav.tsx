import React from 'react';

export default function TopNav(props: {
  tab: 'live' | 'saved';
  onChange: (tab: 'live' | 'saved') => void;
}) {
  const { tab, onChange } = props;
  return (
    <div className="topnav">
      <div className="topnav__title">LLM Job Finder</div>
      <div className="topnav__links">
        <button
          type="button"
          onClick={() => onChange('live')}
          className={`topnav__btn ${tab === 'live' ? 'topnav__btn--active' : ''}`}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => onChange('saved')}
          className={`topnav__btn ${tab === 'saved' ? 'topnav__btn--active' : ''}`}
        >
          History
        </button>
        <span className="topnav__about">About</span>
      </div>
    </div>
  );
}
