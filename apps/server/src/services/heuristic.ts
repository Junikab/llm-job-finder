import type { CVAnalysis, JobItem, RankedJob } from '../types.js';
import { parseListedAgoToDays } from '../lib/utils.js';

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function containsAny(text: string, terms: string[]): boolean {
  if (!text || terms.length === 0) return false;
  const t = text.toLowerCase();
  return terms.some((w) => t.includes(w));
}

function extractKeywords(analysis: CVAnalysis, limit = 6): string[] {
  const out: string[] = [];
  for (const arr of [analysis.titles || [], analysis.topSkills || []]) {
    for (const a of arr) {
      const w = (a || '').toLowerCase().trim();
      if (w && !out.includes(w)) out.push(w);
    }
  }
  if (out.length < limit) {
    const summary = (analysis.summary || '').toLowerCase();
    const words = summary
      .split(/[^a-z0-9+.#/-]+/i)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && w.length <= 30);
    const stop = new Set([
      'the','and','for','with','you','are','that','from','into','your','this','have','has','was','our','their','his','her','she','him','they','them','will','can','but','not','who','how','what','when','where','why','able','over','more','less','very','use','used','using','work','role','team','experience'
    ]);
    for (const w of words) {
      if (!stop.has(w) && !out.includes(w)) out.push(w);
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}

export function scoreHeuristic(analysis: CVAnalysis, job: JobItem): Pick<RankedJob, 'score' | 'reason'> {
  let score = 0;
  const reasons: string[] = [];
  const title = job.title || '';
  const desc = job.description || '';
  const textAll = `${title}\n${desc}`.toLowerCase();

  // Title/keyword match
  const keywords = extractKeywords(analysis);
  let titlePoints = 0;
  if (keywords.length) {
    const matched = keywords.filter((k) => title.toLowerCase().includes(k));
    if (matched.length > 0) {
      // Up to +30 points depending on matches
      titlePoints = Math.min(30, 10 + matched.length * 5);
      score += titlePoints;
      reasons.push(`title +${titlePoints}`);
    }
  }

  // Recency
  const d = parseListedAgoToDays(job.listedAgo);
  let recentPoints = 0;
  if (d !== null) {
    if (d <= 1) recentPoints = 25;
    else if (d <= 3) recentPoints = 20;
    else if (d <= 7) recentPoints = 15;
    else if (d <= 14) recentPoints = 10;
    else if (d <= 30) recentPoints = 5;
    if (recentPoints > 0) {
      score += recentPoints;
      reasons.push(`recency +${recentPoints}`);
    }
  }

  // Remote/hybrid signal
  let remotePoints = 0;
  if (containsAny(textAll, ['remote', 'hybrid', 'work from home'])) {
    remotePoints = 5;
    score += remotePoints;
    reasons.push(`remote +${remotePoints}`);
  }

  // Salary presence
  let salaryPoints = 0;
  if (/\$\s?\d|\d+\s?k\b|salary/i.test(desc)) {
    salaryPoints = 5;
    score += salaryPoints;
    reasons.push(`salary +${salaryPoints}`);
  }

  const final = clampScore(score);
  return { score: final, reason: reasons.length ? reasons.join(', ') : 'heuristic: baseline' };
}
