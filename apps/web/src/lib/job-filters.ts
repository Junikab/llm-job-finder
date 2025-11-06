import { parseListedDays } from '../utils/date';

export type SortKey = 'model' | 'user' | 'recency' | 'applied';

export function includeTracked(
  applied: boolean,
  saved: boolean,
  opts: { appliedOnly: boolean; savedOnly: boolean; defaultTracked?: boolean }
): boolean {
  const { appliedOnly, savedOnly, defaultTracked = true } = opts;
  if (appliedOnly && savedOnly) return applied || saved;
  if (appliedOnly) return applied;
  if (savedOnly) return saved;
  return defaultTracked ? (applied || saved) : true;
}

export function matchesText(
  item: { title?: string | null | undefined; company?: string | null | undefined; location?: string | null | undefined },
  text: string
): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  const t = (item.title || '').toLowerCase();
  const c = (item.company || '').toLowerCase();
  const l = (item.location || '').toLowerCase();
  return t.includes(q) || c.includes(q) || l.includes(q);
}

export type SortableJob = {
  modelScore?: number | null;
  score?: number | null;
  userScore?: number | null;
  listedAgo?: string | null;
  appliedAt?: string | null;
};

export function sortJobs<T extends SortableJob>(
  arr: T[],
  sortBy: SortKey,
  opts?: {
    getAppliedAt?: (item: T) => string | null;
  }
): T[] {
  const copy = [...arr];
  if (sortBy === 'model') {
    copy.sort((a, b) => ((b.modelScore ?? b.score ?? -Infinity) - (a.modelScore ?? a.score ?? -Infinity)));
  } else if (sortBy === 'user') {
    copy.sort((a, b) => ((b.userScore ?? -Infinity) - (a.userScore ?? -Infinity)));
  } else if (sortBy === 'recency') {
    const ad = (x: T) => {
      const d = parseListedDays(x.listedAgo);
      return d == null ? Infinity : d;
    };
    copy.sort((a, b) => ad(a) - ad(b));
  } else if (sortBy === 'applied') {
    const ts = (x: T) => {
      const localAt = opts?.getAppliedAt ? opts.getAppliedAt(x) : null;
      const effective = localAt || x.appliedAt;
      return effective ? Date.parse(effective) : -Infinity;
    };
    copy.sort((a, b) => ts(b) - ts(a));
  }
  return copy;
}
