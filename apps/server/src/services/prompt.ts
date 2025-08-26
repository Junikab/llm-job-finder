import type { CVAnalysis, JobItem } from '../types.js';

/**
 * Format a JobItem into a stable, human-readable block suitable for LLM prompts.
 */
export function formatJobForPrompt(job: JobItem): string {
  const lines: string[] = [];
  lines.push(`Title: ${job.title ?? ''}`);
  if (job.company) lines.push(`Company: ${job.company}`);
  if (job.location) lines.push(`Location: ${job.location}`);
  if (job.listedAgo) lines.push(`Listed: ${job.listedAgo}`);
  lines.push(`URL: ${job.url ?? ''}`);
  const desc = (job.description ?? '').trim();
  lines.push('Description:');
  lines.push(desc.length > 0 ? desc : '(none)');
  return lines.join('\n');
}

/**
 * Build a single-text prompt instructing the LLM to score a job's relevance (0-100)
 * to the given CV summary. Response contract: a single number only.
 */
export function buildJobRelevancePrompt(analysis: Pick<CVAnalysis, 'summary'>, job: JobItem): string {
  const summary = (analysis.summary ?? '').trim();
  const jobBlock = formatJobForPrompt(job);
  return [
    '1. Your task is to rank how relevant the following job is for the provided CV summary in a job search application.',
    '2. This is the CV summary:',
    summary.length > 0 ? summary : '(empty)',
    '',
    '3. This is the job details:',
    jobBlock,
    '',
    '4. Rank the relevance of this job for the CV from 0 to 100.',
    '5. Provide the response as a single number only (no text, no explanation).',
  ].join('\n');
}

/**
 * Helper to parse a numeric relevance score (0..100) from an LLM response.
 * Returns null if no numeric value found. Rounds and clamps into 0..100.
 */
export function parseRelevanceScore(text: string): number | null {
  if (!text) return null;
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Math.round(parseFloat(m[0]));
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}
