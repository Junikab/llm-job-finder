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
    'You are an expert job relevance scorer. Output a single integer (0-100) only.',
    '',
    'Candidate profile (CV summary):',
    summary.length > 0 ? summary : '(empty)',
    '',
    'Scoring rubric (apply cumulatively):',
    '- Role/seniority fit: prefer junior/entry/graduate roles; penalize mid/senior-only roles.',
    '- Tech stack fit: JavaScript/TypeScript, React, CSS, HTML are strong matches; WordPress/Shopify acceptable; penalize roles centered on back-end Java/.NET/PHP without meaningful frontend.',
    '- Frontend/UI emphasis: prefer roles building web UI; penalize backend/infra/devops-only positions.',
    '- Learning/mentorship/training: bonus if the role offers growth, mentoring, or training.',
    '- Location/arrangement: NSW or remote/hybrid-friendly is a bonus; penalize full-time on-site far from Western Sydney (Blacktown LGA).',
    '- Experience demands: 0–3 years ideal; 3–4 acceptable; >5 years required should be penalized unless explicitly junior-friendly.',
    '- Non-developer roles (sales/marketing/PM-only) score near 0.',
    '',
    'Calibration examples (concise):',
    'Relevant (score 80–95): Junior Web Developer using HTML/CSS/JS with Tailwind/Vite; training & mentoring; Sydney.',
    'Relevant (score 80–95): Web Frontend Engineer using React/TypeScript (some Cipress.io); junior-friendly; remote.',
    'Less relevant (score 5–20): Senior Java backend microservices (7+ years); on-site; minimal UI.',
    'Less relevant (score 5–20): DevOps/SRE Kubernetes-focused; little to no frontend work.',
    'Irrelevant (score 0): Sales/Marketing or non-software-development roles.',
    '',
    'Now score the job below from 0 to 100. Return only the number with no text.',
    '',
    'Job details:',
    jobBlock,
    '',
    'Answer with a single integer only (no words, no units).',
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
