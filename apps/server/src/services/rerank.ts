import type { CVAnalysis, JobItem } from '../types.js';

// Rerank has been removed for now. Keep a no-op to avoid breaking imports.
export async function maybeRerankWithLLM(
  _analysis: CVAnalysis,
  scored: Array<JobItem & { score: number; reason: string }>
): Promise<Array<JobItem & { score: number; reason: string }>> {
  return scored;
}
