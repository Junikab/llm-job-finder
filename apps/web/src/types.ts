// Thin shim to re-export API types from the shared package.
// Prefer importing directly from '@shared/types', but this keeps existing imports working
// during the transition while enforcing a single source of truth.
export type { CVAnalysis, JobItem, RankedJob, SavedJob } from '@shared/types';
