// Shared UI types for the web app. Keep in sync with server-side types where relevant.
export type CVAnalysis = {
  summary: string;
  titles: string[];
  topSkills: string[];
  niceToHave?: string[];
  locationHints?: string[];
};

export type RankedJob = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url: string;
  listedAgo?: string; // e.g., "3 days ago"
  description?: string;
  score: number; // 0-100
  reason: string;
};

export type SavedJob = {
  id: string;
  key: string;
  title: string | null;
  url: string | null;
  company: string | null;
  listedAgo: string | null;
  modelScore: number | null;
  userScore: number | null;
  source: string;
  data?: any;
};
