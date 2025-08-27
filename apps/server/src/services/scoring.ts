import path from 'path';
import fs from 'fs/promises';
import type { CVAnalysis, JobItem, RankedJob } from '../types.js';
import { normalizeJobKey, safeFileName, shortHash } from '../lib/job-keys.js';

/**
 * Scoring-related helpers and persistence for scored job snapshots.
 * This module is intended to grow with heuristic/LLM logic.
 */

/**
 * Persist scored job snapshots to `<dir>/scored/`.
 */
export async function saveScoredJobs(
  reqId: string,
  dir: string,
  scored: Array<JobItem & { score?: number | null; reason?: string }>
) {
  const scoredDir = path.join(dir, 'scored');
  await fs.mkdir(scoredDir, { recursive: true });
  await Promise.all(
    scored.map(async (job, idx) => {
      const stableKey = normalizeJobKey(((job as any).url || (job as any).id || '') as string);
      const base = safeFileName(stableKey || (job as any).title || `job-${idx}`);
      const fname = `${base}_${shortHash(stableKey || base)}_scored.json`;
      const record = {
        id: stableKey || null,
        source: 'jora',
        scoredAt: new Date().toISOString(),
        modelScore: typeof (job as any).score === 'number' ? (job as any).score : null,
        userScore: null as number | null,
        'job-description': (job as any).description ?? null,
        reqId,
        reason: (job as any).reason,
        data: job,
      };
      await fs.writeFile(path.join(scoredDir, fname), JSON.stringify(record, null, 2), 'utf8');
    })
  );
}

/**
 * Derive score mode from env.
 */
function getScoreMode(): 'random' | 'heuristic' | 'llm' {
  const mode = (process.env.SCORE_MODE || 'random').toLowerCase();
  if (mode === 'heuristic' || mode === 'llm') return mode as any;
  return 'random';
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseListedAgoDays(listedAgo?: string): number | null {
  if (!listedAgo) return null;
  const s = listedAgo.toLowerCase().trim();
  if (s.includes('just') || s.includes('today') || s.includes('hour')) return 0;
  const m = s.match(/(\d+)(\+)?\s*(day|days|d|week|weeks|w|month|months|m)/);
  if (!m) return null;
  const value = parseInt(m[1] || '0', 10);
  const plus = !!m[2];
  const unit = m[3];
  let days = value;
  if (unit.startsWith('week') || unit === 'w') days = value * 7;
  else if (unit.startsWith('month') || unit === 'm') days = value * 30;
  if (plus) days = Math.max(days, value); // e.g., 30+ days
  return days;
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

function scoreHeuristic(analysis: CVAnalysis, job: JobItem): Pick<RankedJob, 'score' | 'reason'> {
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
  const d = parseListedAgoDays(job.listedAgo);
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

/**
 * Score a single job given the CV analysis. Heuristic by default; random if specified; LLM stub.
 */
export async function scoreJob(
  _analysis: CVAnalysis,
  _job: JobItem
): Promise<Pick<RankedJob, 'score' | 'reason'>> {
  const mode = getScoreMode();
  if (mode === 'random') {
    return { score: Math.floor(Math.random() * 101), reason: 'random' };
  }
  if (mode === 'heuristic') {
    return scoreHeuristic(_analysis, _job);
  }
  // LLM: not yet implemented; fallback to heuristic for now
  const h = scoreHeuristic(_analysis, _job);
  return { score: h.score, reason: `${h.reason}; llm-disabled` };
}
