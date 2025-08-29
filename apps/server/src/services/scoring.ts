import path from 'path';
import fs from 'fs/promises';
import type { CVAnalysis, JobItem, RankedJob } from '../types.js';
import { normalizeJobKey, safeFileName, shortHash } from '../lib/job-keys.js';
import { buildJobRelevancePrompt, parseRelevanceScore } from './prompt.js';

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

type LLMConfig = {
  mode: 'off' | 'rerank' | 'replace';
  topN: number;
  concurrency: number;
  timeoutMs: number;
  apiKey?: string;
  model: string;
};

function getLLMConfig(): LLMConfig {
  const modeRaw = (process.env.LLM_MODE || 'off').toLowerCase();
  const mode: LLMConfig['mode'] = modeRaw === 'rerank' || modeRaw === 'replace' ? (modeRaw as any) : 'off';
  const topN = Math.max(1, Math.min(50, Number(process.env.LLM_TOP_N || 10)));
  const concurrency = Math.max(1, Math.min(5, Number(process.env.LLM_CONCURRENCY || 2)));
  const timeoutMs = Math.max(1000, Math.min(60000, Number(process.env.LLM_TIMEOUT_MS || 8000)));
  const apiKey = process.env.OPENAI_API_KEY || undefined;
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  return { mode, topN, concurrency, timeoutMs, apiKey, model };
}

/**
 * Expose an appropriate concurrency for scoring jobs end-to-end.
 * If LLM replace-mode is enabled, use its configured concurrency; otherwise default to 3.
 */
export function scoringConcurrency(): number {
  const mode = getScoreMode();
  const cfg = getLLMConfig();
  return mode === 'llm' && cfg.mode === 'replace' ? cfg.concurrency : 3;
}

function formatLLMError(err: any): string {
  try {
    if (err && typeof err === 'object' && (err as any).name === 'AbortError') return 'timeout';
    const msg = (err && (err as any).message) ? (err as any).message : String(err);
    return String(msg).replace(/\s+/g, ' ').slice(0, 140);
  } catch {
    return 'unknown-error';
  }
}

/**
 * Optionally rerank the already-scored results using LLM (scaffold).
 * Currently a stub: only appends a note when rerank would apply; returns input unchanged.
 */
export async function maybeRerankWithLLM(
  analysis: CVAnalysis,
  scored: Array<JobItem & { score: number; reason: string }>
): Promise<Array<JobItem & { score: number; reason: string }>> {
  const scoreMode = getScoreMode();
  const cfg = getLLMConfig();
  if (scoreMode !== 'llm' || cfg.mode !== 'rerank' || !cfg.apiKey) {
    return scored;
  }

  const topN = Math.min(cfg.topN, scored.length);
  const top = scored.slice(0, topN);

  // Build compact items for prompt
  const topItems = top.map((j, idx) => {
    const key = normalizeJobKey(((j as any).url || (j as any).id || (j as any).title || `job-${idx}`) as string) || `job-${idx}`;
    const desc = (j.description || '').replace(/\s+/g, ' ').slice(0, 400);
    return { id: key, title: j.title || '', listedAgo: j.listedAgo || '', location: (j as any).location || '', description: desc };
  });

  const profile = {
    titles: analysis.titles || [],
    topSkills: analysis.topSkills || [],
    summary: analysis.summary?.slice(0, 500) || ''
  };

  const system = 'You are an expert job-ranker. Given a job seeker profile and a list of jobs, return strictly valid JSON with best-to-worst order and a very short reason per job. Keep reasons concise (<=15 words). Do not include any text outside of JSON.';
  const user = `Profile: ${JSON.stringify(profile)}\nJobs: ${JSON.stringify(topItems)}\nRespond with JSON: {"order": [jobId...], "reasons": {jobId: reason}}`;

  try {
    const { content } = await callOpenAIChatJSON(cfg, system, user);
    let parsed: any = null;
    try { parsed = JSON.parse(content || '{}'); } catch {}
    const order: string[] = Array.isArray(parsed?.order) ? parsed.order : [];
    const reasonsMap: Record<string, string> = parsed?.reasons && typeof parsed.reasons === 'object' ? parsed.reasons : {};

    if (!order.length) {
      // Annotate that rerank failed; keep original
      if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
        console.warn('[llm] rerank returned no order');
      }
      return top
        .map((j) => ({ ...j, reason: `${j.reason}; llm-rerank-error: no-order` }))
        .concat(scored.slice(topN));
    }

    const idToJob = new Map<string, (JobItem & { score: number; reason: string })>();
    for (let i = 0; i < top.length; i++) {
      const j = top[i];
      const key = normalizeJobKey(((j as any).url || (j as any).id || (j as any).title || `job-${i}`) as string) || `job-${i}`;
      idToJob.set(key, j);
    }

    const used = new Set<string>();
    const orderedTop: Array<JobItem & { score: number; reason: string }> = [];
    for (let i = 0; i < order.length; i++) {
      const id = String(order[i]);
      const j = idToJob.get(id);
      if (!j) continue;
      used.add(id);
      const reasonExtra = reasonsMap[id] ? `; llm: ${String(reasonsMap[id]).slice(0, 120)}` : '';
      orderedTop.push({ ...j, reason: `${j.reason}; llm-rerank pos ${i + 1}${reasonExtra}` });
    }
    // Append any not mentioned jobs from the top slice, preserving their relative order
    for (let i = 0; i < top.length; i++) {
      const j = top[i];
      const id = normalizeJobKey(((j as any).url || (j as any).id || (j as any).title || `job-${i}`) as string) || `job-${i}`;
      if (!used.has(id)) orderedTop.push({ ...j, reason: `${j.reason}; llm-rerank` });
    }

    // Append the rest of the list after the reranked top-N
    const out = orderedTop.concat(scored.slice(topN));
    if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
      console.log('[llm] rerank applied', { topN, ordered: orderedTop.length });
    }
    return out;
  } catch (err: any) {
    // On error, keep original but annotate top-N
    const errMsg = formatLLMError(err);
    if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
      console.warn('[llm] rerank failed', { err: errMsg });
    }
    return scored.map((j, idx) => (
      idx < topN ? { ...j, reason: `${j.reason}; llm-rerank-error: ${errMsg}` } : j
    ));
  }
}

async function callOpenAIChatJSON(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const tStart = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal as any
    } as any);
    if (!res.ok) {
      const txt = await (res as any).text?.();
      if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
        console.warn('[llm] openai http error', { status: (res as any).status, body: String(txt || '').slice(0, 200) });
      }
      throw new Error(`openai http ${res.status}: ${txt || ''}`.trim());
    }
    const data: any = await (res as any).json();
    const content = data?.choices?.[0]?.message?.content || '';
    if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
      console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length });
    }
    return { content };
  } finally {
    clearTimeout(t);
  }
}

// Chat call for plain text responses (no JSON response_format), suitable for single-number scoring.
async function callOpenAIChatText(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const tStart = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal as any
    } as any);
    if (!res.ok) {
      const txt = await (res as any).text?.();
      if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
        console.warn('[llm] openai http error', { status: (res as any).status, body: String(txt || '').slice(0, 200) });
      }
      throw new Error(`openai http ${res.status}: ${txt || ''}`.trim());
    }
    const data: any = await (res as any).json();
    const content = data?.choices?.[0]?.message?.content || '';
    if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
      console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length });
    }
    return { content };
  } finally {
    clearTimeout(t);
  }
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
  // LLM mode
  const cfg = getLLMConfig();
  if (cfg.mode === 'replace' && cfg.apiKey) {
    const system = 'You score job relevance precisely. Output only a single integer 0-100, no extra text.';
    const user = buildJobRelevancePrompt({ summary: _analysis.summary ?? '' }, _job);
    try {
      const { content } = await callOpenAIChatText(cfg, system, user);
      const n = parseRelevanceScore(content || '');
      if (n !== null) {
        return { score: n, reason: `llm-replace ${cfg.model}` };
      }
      if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
        console.warn('[llm] replace parse failed', { content: String(content || '').slice(0, 160) });
      }
      const h = scoreHeuristic(_analysis, _job);
      return { score: h.score, reason: `${h.reason}; llm-replace-error: no-number` };
    } catch (err: any) {
      const errMsg = formatLLMError(err);
      if ((process.env.LLM_LOG || '').toLowerCase() === 'debug') {
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
