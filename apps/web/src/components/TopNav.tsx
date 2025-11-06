import React from 'react';

const NAV_LINKS: Array<{ key: 'live' | 'saved'; label: string }> = [
  { key: 'live', label: 'Live' },
  { key: 'saved', label: 'Saved' },
];

type TopNavProps = {
  currentPage: 'about' | 'live' | 'saved';
  onNavigatePage: (page: 'about' | 'live' | 'saved') => void;
};

export default function TopNav({ currentPage, onNavigatePage }: TopNavProps) {
  return (
    <div className="topnav">
      <div className="topnav__title">LLM Job Finder</div>
      <div className="topnav__links">
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
        {NAV_LINKS.map(link => (
          <button
            key={link.key}
            type="button"
            onClick={() => {
              onNavigatePage(link.key);
            }}
            className={`topnav__btn ${currentPage === link.key ? 'topnav__btn--active' : ''}`}
            aria-current={currentPage === link.key ? 'page' : undefined}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}
