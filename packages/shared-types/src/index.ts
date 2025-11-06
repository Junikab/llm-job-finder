// Public API types shared by server and web

export type CVAnalysis = {
  summary: string;
  titles: string[];
  topSkills: string[];
  niceToHave?: string[];
  locationHints?: string[];
  /** When true, search should omit any explicit location filter (worldwide). */
  worldwide?: boolean;
  /** Optional manual search URL for advanced users (used during rescore). */
  manualSearchUrl?: string;
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
  key: string;
  score: number; // 0-100
  reason: string;
};

// Aggregated job record returned by /api/db/jobs
export type SavedJob = {
  id: string;
  key: string;
  title: string | null;
  url: string | null;
  company: string | null;
  location: string | null;
  listedAgo: string | null;
  modelScore: number | null;
  userScore: number | null;
  applied: boolean | null;
  appliedAt: string | null;
  saved?: boolean | null;
  savedAt?: string | null;
  reason: string | null;
  source: string;
  data?: any;
};

// Minimal user profile storing an edited analysis for future reuse
export type Profile = {
  id: string;
  label: string | null;
  analysis: CVAnalysis;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  lastUsedAt: string | null; // ISO date or null
};
