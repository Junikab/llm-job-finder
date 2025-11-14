import { useCallback, useEffect, useMemo, useState } from 'react';

export type AppPage = 'about' | 'live' | 'saved';

/**
 * Derive a valid AppPage from a pathname string.
 */
function pageFromPathname(pathname: string): AppPage {
  if (pathname.startsWith('/live')) return 'live';
  if (pathname.startsWith('/saved')) return 'saved';
  return 'about';
}

/**
 * usePageRouter
 * - Manages simple history-based routing for three pages: about, live, saved
 * - Synchronizes state with window.location.pathname and popstate
 */
export function usePageRouter(): {
  page: AppPage;
  navigatePage: (next: AppPage) => void;
} {
  const initialPage: AppPage = useMemo(() => {
    if (typeof window === 'undefined') return 'about';
    return pageFromPathname(window.location.pathname);
  }, []);

  const [page, setPage] = useState<AppPage>(initialPage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Ensure state and URL are synced on mount
    const current = pageFromPathname(window.location.pathname);
    if (current !== page) setPage(current);

    const onPopState = () => {
      const p = pageFromPathname(window.location.pathname);
      setPage(p);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigatePage = useCallback((next: AppPage) => {
    setPage(next);
    if (typeof window === 'undefined') return;
    const targetPath = next === 'about' ? '/about' : (next === 'live' ? '/live' : '/saved');
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: next }, '', targetPath);
    }
  }, []);

  return { page, navigatePage };
}
