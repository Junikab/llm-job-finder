import pLimit from 'p-limit';
import type { CVAnalysis, JobItem, RankedJob } from '@shared/types';
import { scoreJob, scoringConcurrency } from '../scoring.js';
import { normalizeJobKey } from '../../lib/job-keys.js';

export async function scoreJobs(analysis: CVAnalysis, jobsToScore: JobItem[]): Promise<RankedJob[]> {
  const limit = pLimit(scoringConcurrency());
  const scored = await Promise.all(
    jobsToScore.map(job => limit(async () => {
      const key = normalizeJobKey((job as any).url || (job as any).id || '');
      return { ...job, key, ...(await scoreJob(analysis, job)) };
    }))
  );
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored as RankedJob[];
}
