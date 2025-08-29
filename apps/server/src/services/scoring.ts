import { createHash } from 'crypto';
import type { CVAnalysis, JobItem, RankedJob } from '../types.js';
import { normalizeJobKey } from '../lib/job-keys.js';
import { buildJobRelevancePrompt, parseRelevanceScore } from './prompt.js';
import { LLM_DEBUG, getLLMConfig, formatLLMError, callOpenAIChatText } from './llm.js';
import { scoreHeuristic } from './heuristic.js';

/**
 * Scoring-related helpers (heuristic and LLM) for ranking jobs.
 */

 

 

/**
 * Derive score mode from env.
 */
function getScoreMode(): 'random' | 'heuristic' | 'llm' {
  const mode = (process.env.SCORE_MODE || 'random').toLowerCase();
  if (mode === 'heuristic' || mode === 'llm') return mode as any;
  return 'random';
}

 

// Simple in-memory TTL + LRU cache for LLM replace-mode scores
const LLM_CACHE_TTL_MS = Math.max(1, Number(process.env.LLM_CACHE_TTL_MS || 15 * 60 * 1000));
const LLM_CACHE_MAX = Math.max(1, Number(process.env.LLM_CACHE_MAX || 200));
type CacheEntry = { score: number; reason: string; t: number };
const SCORE_CACHE = new Map<string, CacheEntry>();

function hash16(s: string): string {
  return createHash('sha1').update(s).digest('hex').slice(0, 16);
}

function cacheGet(key: string): CacheEntry | null {
  const e = SCORE_CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.t > LLM_CACHE_TTL_MS) {
    SCORE_CACHE.delete(key);
    return null;
  }
  // refresh LRU
  SCORE_CACHE.delete(key);
  SCORE_CACHE.set(key, { ...e, t: Date.now() });
  return e;
}

function cacheSet(key: string, entry: CacheEntry) {
  SCORE_CACHE.set(key, entry);
  while (SCORE_CACHE.size > LLM_CACHE_MAX) {
    const firstKey = SCORE_CACHE.keys().next().value as string | undefined;
    if (!firstKey) break;
    SCORE_CACHE.delete(firstKey);
  }
}

 

// LLM config moved to ./llm.ts

/**
 * Expose an appropriate concurrency for scoring jobs end-to-end.
 * If LLM replace-mode is enabled, use its configured concurrency; otherwise default to 3.
 */
export function scoringConcurrency(): number {
  const mode = getScoreMode();
  const cfg = getLLMConfig();
  return mode === 'llm' && cfg.mode === 'replace' ? cfg.concurrency : 3;
}

// formatLLMError moved to ./llm.ts

 

 

/**
 * Score a single job given the CV analysis.
 * Modes: random | heuristic | llm (replace-mode implemented with heuristic fallback).
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
  // LLM mode
  const cfg = getLLMConfig();
  if (cfg.mode === 'replace' && cfg.apiKey) {
    // Cache key based on model, stable job identity, job/summary content and traits
    const goodTraits = (process.env.LLM_GOOD_TRAITS || '').trim();
    const badTraits = (process.env.LLM_BAD_TRAITS || '').trim();
    const jobKey = normalizeJobKey(((_job as any).url || ( _job as any).id || (_job as any).title || '') as string) || '';
    const cacheKey = [
      cfg.model,
      jobKey,
      hash16(_job.description || ''),
      hash16(_analysis.summary || ''),
      hash16(`${goodTraits}|${badTraits}`)
    ].join('|');
    const hit = cacheGet(cacheKey);
    if (hit) {
      if (LLM_DEBUG) {
        console.log('[llm] cache hit', { jobKey, model: cfg.model });
      }
      return { score: hit.score, reason: `${hit.reason} cache-hit` };
    }
    const system = 'You score job relevance precisely. Output only a single integer 0-100, no extra text.';
    const user = buildJobRelevancePrompt({ summary: _analysis.summary ?? '' }, _job);
    try {
      const { content } = await callOpenAIChatText(cfg, system, user);
      const n = parseRelevanceScore(content || '');
      if (n !== null) {
        const reason = `llm-replace ${cfg.model}`;
        cacheSet(cacheKey, { score: n, reason, t: Date.now() });
        return { score: n, reason };
      }
      if (LLM_DEBUG) {
        console.warn('[llm] replace parse failed', { content: String(content || '').slice(0, 160) });
      }
      const h = scoreHeuristic(_analysis, _job);
      return { score: h.score, reason: `${h.reason}; llm-replace-error: no-number` };
    } catch (err: any) {
      const errMsg = formatLLMError(err);
      if (LLM_DEBUG) {
        console.warn('[llm] replace failed', { err: errMsg });
      }
      const h = scoreHeuristic(_analysis, _job);
      return { score: h.score, reason: `${h.reason}; llm-replace-error: ${errMsg}` };
    }
  }
  // If LLM not configured for replace, fallback to heuristic and annotate
  const h = scoreHeuristic(_analysis, _job);
  return { score: h.score, reason: `${h.reason}; llm-disabled` };
}
