import { createHash } from 'crypto';
import type { CVAnalysis, JobItem, RankedJob } from '../types.js';
import { normalizeJobKey } from '../lib/job-keys.js';
import { buildJobRelevancePrompt, LLM_SCORING_SYSTEM } from './prompt.js';
import { LLM_DEBUG, getLLMConfig, formatLLMError, callOpenAIChatJSON } from './llm.js';

/**
 * Scoring-related helpers (random and LLM) for ranking jobs.
 */

 

 

/**
 * Derive score mode (only 'random' or 'llm').
 * Any unknown value falls back to 'random'.
 */
function getScoreMode(): 'random' | 'llm' {
  const mode = (process.env.SCORE_MODE || 'random').toLowerCase();
  if (mode === 'llm') return 'llm';
  return 'random';
}

 

// Simple in-memory TTL + LRU cache for LLM scoring results
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
 * If LLM scoring is enabled, use its configured concurrency; otherwise default to 3.
 */
export function scoringConcurrency(): number {
  const mode = getScoreMode();
  const cfg = getLLMConfig();
  return mode === 'llm' && !!cfg.apiKey ? cfg.concurrency : 3;
}

// formatLLMError moved to ./llm.ts

 

 

/**
 * Score a single job given the CV analysis.
 * Modes: random | llm (falls back to random on failure).
 */
export async function scoreJob(
  _analysis: CVAnalysis,
  _job: JobItem
): Promise<Pick<RankedJob, 'score' | 'reason'>> {
  const mode = getScoreMode();
  if (mode === 'random') {
    return { score: Math.floor(Math.random() * 101), reason: 'random' };
  }
  // LLM mode
  const cfg = getLLMConfig();
  if (cfg.apiKey) {
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
        console.log('[llm] score', { jobKey, score: hit.score, source: 'cache' });
      }
      return { score: hit.score, reason: `${hit.reason} cache-hit` };
    }
    const system = LLM_SCORING_SYSTEM;
    const user = buildJobRelevancePrompt({ summary: _analysis.summary ?? '' }, _job);
    if (LLM_DEBUG) {
      const jobKeyDbg = normalizeJobKey(((_job as any).url || (_job as any).id || (_job as any).title || '') as string) || '';
      // Print a concise header and a truncated user prompt body to avoid overwhelming logs
      console.log('[llm] score prompt', { jobKey: jobKeyDbg, model: cfg.model, system, userLen: user.length });
      console.log('[llm] score prompt user', user.slice(0, 8000));
    }
    try {
      const { content } = await callOpenAIChatJSON(cfg, system, user);
      let parsed: any = null;
      try {
        parsed = JSON.parse(content || '{}');
      } catch {
        parsed = null;
      }
      const nRaw = parsed && typeof parsed.score !== 'undefined' ? parsed.score : null;
      const nNum = typeof nRaw === 'number' ? Math.round(nRaw) : (typeof nRaw === 'string' ? Math.round(parseFloat(nRaw)) : null);
      const n = nNum == null || Number.isNaN(nNum) ? null : Math.max(0, Math.min(100, nNum));
      const reasonLLM = parsed && typeof parsed.reason === 'string' ? String(parsed.reason).trim() : '';
      if (n !== null) {
        const reason = reasonLLM || `llm ${cfg.model}`;
        cacheSet(cacheKey, { score: n, reason, t: Date.now() });
        if (LLM_DEBUG) {
          console.log('[llm] score', { jobKey, score: n, model: cfg.model });
        }
        return { score: n, reason };
      }
      if (LLM_DEBUG) {
        console.warn('[llm] parse failed', { content: String(content || '').slice(0, 160) });
      }
      const r = Math.floor(Math.random() * 101);
      return { score: r, reason: `random; llm-error: bad-json` };
    } catch (err: any) {
      const errMsg = formatLLMError(err);
      if (LLM_DEBUG) {
        console.warn('[llm] score failed', { err: errMsg });
      }
      const r = Math.floor(Math.random() * 101);
      return { score: r, reason: `random; llm-error: ${errMsg}` };
    }
  }
  // If LLM not configured, fallback to random and annotate
  const r = Math.floor(Math.random() * 101);
  return { score: r, reason: `random; llm-disabled` };
}
