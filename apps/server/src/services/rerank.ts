import type { CVAnalysis, JobItem } from '../types.js';
import { normalizeJobKey } from '../lib/job-keys.js';
import { LLM_DEBUG, getLLMConfig, formatLLMError, callOpenAIChatJSON } from './llm.js';

/**
 * Optionally rerank the already-scored results using LLM (scaffold).
 * Currently returns input unchanged unless LLM rerank mode is enabled.
 */
export async function maybeRerankWithLLM(
  analysis: CVAnalysis,
  scored: Array<JobItem & { score: number; reason: string }>
): Promise<Array<JobItem & { score: number; reason: string }>> {
  const cfg = getLLMConfig();
  if (cfg.mode !== 'rerank' || !cfg.apiKey) {
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
      if (LLM_DEBUG) {
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
    if (LLM_DEBUG) {
      console.log('[llm] rerank applied', { topN, ordered: orderedTop.length });
    }
    return out;
  } catch (err: any) {
    // On error, keep original but annotate top-N
    const errMsg = formatLLMError(err);
    if (LLM_DEBUG) {
      console.warn('[llm] rerank failed', { err: errMsg });
    }
    return scored.map((j, idx) => (
      idx < topN ? { ...j, reason: `${j.reason}; llm-rerank-error: ${errMsg}` } : j
    ));
  }
}
