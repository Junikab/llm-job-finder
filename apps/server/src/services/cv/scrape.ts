import { scrapeJora } from 'scraper';
import type { JobItem } from '../../types.js';

export async function scrapeWithRetry(searchUrls: string[], options: {
  headless: boolean,
  maxPages: number,
  maxJobs: number,
  totalTimeoutMs?: number,
}): Promise<JobItem[]> {
  try {
    return await scrapeJora(searchUrls, options);
  } catch (err) {
    return await scrapeJora(searchUrls, options); // single retry
  }
}
