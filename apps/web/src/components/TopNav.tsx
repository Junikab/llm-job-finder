import React from 'react';

const NAV_LINKS: Array<{ key: 'live' | 'saved'; label: string }> = [
  { key: 'live', label: 'Live' },
  { key: 'saved', label: 'Saved' },
];

type TopNavProps = {
  tab: 'live' | 'saved';
  currentPage: 'home' | 'about';
  onChangeTab: (tab: 'live' | 'saved') => void;
  onNavigatePage: (page: 'home' | 'about') => void;
};

export default function TopNav({ tab, currentPage, onChangeTab, onNavigatePage }: TopNavProps) {
  return (
    <div className="topnav">
      <div className="topnav__title">LLM Job Finder</div>
      <div className="topnav__links">
        {NAV_LINKS.map(link => (
          <button
            key={link.key}
            type="button"
            onClick={() => {
              onNavigatePage('home');
              onChangeTab(link.key);
            }}
            className={`topnav__btn ${currentPage === 'home' && tab === link.key ? 'topnav__btn--active' : ''}`}
            aria-current={currentPage === 'home' && tab === link.key ? 'page' : undefined}
          >
            {link.label}
          </button>
        ))}
        <a
          href="/about"
          className={`topnav__btn topnav__link ${currentPage === 'about' ? 'topnav__btn--active' : ''}`}
          aria-current={currentPage === 'about' ? 'page' : undefined}
          onClick={event => {
            event.preventDefault();
            onNavigatePage('about');
          }}
        >
          About
        </a>
      </div>
    </div>
  );
}
