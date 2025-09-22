import type { RankedJob, JobItem } from '@shared/types';

// Convert a RankedJob (what the UI shows) to a JobItem (what the server expects for rescoring)
export function mapRankedToJobItem(r: RankedJob): JobItem {
  return {
    id: r.id,
    title: r.title,
    company: r.company,
    location: r.location,
    url: r.url,
    listedAgo: r.listedAgo,
    description: r.description,
  };
}
