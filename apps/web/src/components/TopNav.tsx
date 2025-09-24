import React from 'react';

export default function TopNav(props: {
  tab: 'live' | 'saved';
  onChange: (tab: 'live' | 'saved') => void;
  onAbout?: () => void;
}) {
  const { tab, onChange, onAbout } = props;
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
          Saved
        </button>
        <button
          type="button"
          onClick={() => onAbout?.()}
          className="topnav__btn"
          aria-label="About"
        >
          About
        </button>
      </div>
    </div>
  );
}
