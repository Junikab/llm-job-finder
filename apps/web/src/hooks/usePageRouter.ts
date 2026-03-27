import { useCallback, useEffect, useMemo, useState } from 'react';

export type AppPage = 'about' | 'live' | 'saved';

/**
 * Derive a valid AppPage from a route string.
 */
function pageFromRoute(route: string): AppPage {
  if (route.startsWith('/live')) return 'live';
  if (route.startsWith('/saved')) return 'saved';
  return 'about';
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function routeFromPage(page: AppPage): string {
  if (page === 'live') return '/live';
  if (page === 'saved') return '/saved';
  return '/about';
}

function pageFromLocation(loc: Location): AppPage {
  const hashRoute = normalizeRoute(loc.hash.replace(/^#/, ''));
  if (hashRoute) return pageFromRoute(hashRoute);
  return pageFromRoute(loc.pathname);
}

/**
 * usePageRouter
 * - Manages simple URL routing for three pages: about, live, saved
 * - Uses hash routes (e.g. #/live) for static hosting compatibility
 */
export function usePageRouter(): {
  page: AppPage;
  navigatePage: (next: AppPage) => void;
} {
  const initialPage: AppPage = useMemo(() => {
    if (typeof window === 'undefined') return 'about';
    return pageFromLocation(window.location);
  }, []);

  const [page, setPage] = useState<AppPage>(initialPage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = pageFromLocation(window.location);
    if (current !== page) setPage(current);

    const syncFromUrl = () => {
      const p = pageFromLocation(window.location);
      setPage(p);
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigatePage = useCallback((next: AppPage) => {
    setPage(next);
    if (typeof window === 'undefined') return;
    const targetHash = `#${routeFromPage(next)}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  return { page, navigatePage };
}
