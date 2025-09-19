import pLimit from 'p-limit';
import type { CVAnalysis, JobItem, RankedJob } from '../../types.js';
import { scoreJob, scoringConcurrency } from '../scoring.js';

export async function scoreJobs(analysis: CVAnalysis, jobsToScore: JobItem[]): Promise<RankedJob[]> {
  const limit = pLimit(scoringConcurrency());
  const scored = await Promise.all(
    jobsToScore.map(job => limit(async () => ({ ...job, ...(await scoreJob(analysis, job)) })))
  );
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored as RankedJob[];
}
