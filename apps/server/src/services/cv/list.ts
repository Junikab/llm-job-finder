import { normalizeJobKey } from '../../lib/job-keys.js';
import { parseListedAgoToDays } from '../../lib/utils.js';
import type { CVAnalysis, JobItem } from '../../types.js';

export function dedupeJobs(rawJobs: JobItem[]): JobItem[] {
  const uniq = new Map<string, JobItem>();
  for (const j of rawJobs) {
    const key = normalizeJobKey((j as any).url || (j as any).id || '');
    if (key && !uniq.has(key)) uniq.set(key, j);
  }
  return Array.from(uniq.values());
}

export function filterByDays(jobs: JobItem[], days?: number): JobItem[] {
  if (typeof days !== 'number') return jobs;
  return jobs.filter(j => {
    const d = parseListedAgoToDays(j.listedAgo);
    return d === null || d <= days;
  });
}

// Lightweight pre-sort based on simple keyword signals from titles and skills.
// This is NOT a scoring mode; it only helps choose which jobs to score first.
export function preSortByKeywordSignals(jobs: JobItem[], analysis: CVAnalysis): JobItem[] {
  const skills = new Set((analysis.topSkills || []).map(s => s.toLowerCase()));
  const titleTokens = new Set((analysis.titles || []).map(t => t.toLowerCase()));
  const scores = new Map<JobItem, number>();
  for (const j of jobs) {
    const t = (j.title || '').toLowerCase();
    const desc = (j.description || '').toLowerCase();
    let s = 0;
    for (const tok of titleTokens) if (t.includes(tok)) s += 2;
    for (const sk of skills) if (desc.includes(sk)) s += 1;
    scores.set(j, s);
  }
  return [...jobs].sort((a, b) => (scores.get(b)! - scores.get(a)!));
}
