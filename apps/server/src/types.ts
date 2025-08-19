
export type CVAnalysis = {
  summary: string;
  titles: string[];
  topSkills: string[];
  niceToHave: string[];
  locationHints?: string[];
};

export type JobItem = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url: string;
  listedAgo?: string; // e.g., "3 days ago"
  description?: string; // filled after detail fetch
};

export type RankedJob = JobItem & {
  score: number; // 0-100
  reason: string;
};
