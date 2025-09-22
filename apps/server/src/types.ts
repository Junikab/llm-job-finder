
// Re-export public API types from the shared package to keep server code working
// and maintain a single source of truth for the contract types.
export type { CVAnalysis, JobItem, RankedJob, SavedJob } from '@shared/types';
