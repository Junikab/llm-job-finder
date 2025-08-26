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
        reqId,
        reason: (job as any).reason,
        data: job,
      };
      await fs.writeFile(path.join(scoredDir, fname), JSON.stringify(record, null, 2), 'utf8');
    })
  );
}

/**
 * Score a single job given the CV analysis. Placeholder for future heuristic/LLM.
 */
export async function scoreJob(
  _analysis: CVAnalysis,
  _job: JobItem
): Promise<Pick<RankedJob, 'score' | 'reason'>> {
  // TODO: replace with heuristic + optional LLM rerank
  return { score: Math.floor(Math.random() * 101), reason: 'Mock score' };
}
