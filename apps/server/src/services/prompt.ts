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
  const goodTraits = (process.env.LLM_GOOD_TRAITS || '').trim();
  const badTraits = (process.env.LLM_BAD_TRAITS || '').trim();
  return [
    'You are an expert job relevance scorer. Output a single integer (0-100) only.',
    '',
    '<candidate>',
    'Candidate profile (CV summary):',
    summary.length > 0 ? summary : '(empty)',
    ...(goodTraits || badTraits ? ['', 'Compact prompt customization (optional):'] : []),
    ...(goodTraits ? [`Good traits: ${goodTraits}`] : []),
    ...(badTraits ? [`Bad traits: ${badTraits}`] : []),
    '</candidate>',
    '',
    '<rubric>',
    'Scoring rubric (apply cumulatively):',
    '- Role/seniority fit: prefer junior/entry/graduate roles; penalize mid/senior-only roles.',
    '- Tech stack fit: JavaScript/TypeScript, React, CSS, HTML are strong matches; WordPress/Shopify acceptable; penalize roles centered on back-end Java/.NET/PHP without meaningful frontend.',
    '- Frontend/UI emphasis: prefer roles building web UI; penalize backend/infra/devops-only positions.',
    '- Learning/mentorship/training: bonus if the role offers growth, mentoring, or training.',
    '- Location/arrangement: NSW or remote/hybrid-friendly is a bonus; penalize full-time on-site far from Western Sydney (Blacktown LGA).',
    '- Experience demands: 0–3 years ideal; 3–4 acceptable; >5 years required should be penalized unless explicitly junior-friendly.',
    '- Non-developer roles (sales/marketing/PM-only) score near 0.',
    '</rubric>',
    '',
    '<examples>',
    'Calibration examples (concise):',
    'Relevant (score 80–95): Junior Web Developer using HTML/CSS/JS with Tailwind/Vite; training & mentoring; Sydney.',
    'Relevant (score 80–95): Web Frontend Engineer using React/TypeScript (some Cipress.io); junior-friendly; remote.',
    'Less relevant (score 5–20): Senior Java backend microservices (7+ years); on-site; minimal UI.',
    'Less relevant (score 5–20): DevOps/SRE Kubernetes-focused; little to no frontend work.',
    'Irrelevant (score 0): Sales/Marketing or non-software-development roles.',
    '</examples>',
    '',
    '<task>',
    'Now score the job below from 0 to 100. Return only the number with no text.',
    '</task>',
    '',
    '<job>',
    'Job details:',
    jobBlock,
    '</job>',
    '',
    '<answer>',
    'Answer with a single integer only (no words, no units).',
    '</answer>',
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

/**
 * Build a general-purpose prompt to summarize the raw CV text into a concise candidate
 * profile suitable for downstream job relevance scoring for ANY job seeker. The model
 * must return ONLY the summary text (no preamble, no XML, no JSON).
 */
export function buildCVSummaryPrompt(cvText: string): { system: string; user: string } {
  const system = 'You write concise, role-agnostic candidate summaries tailored strictly to the provided CV. Base the summary only on the CV; do not guess or add facts. Do not include personal contact details or identifiers. Return only the summary text.';
  const safe = (cvText || '').slice(0, 6000); // keep prompt size reasonable
  const user = [
    '<task>Summarize the candidate\'s CV into 4–6 sentences. Be role-agnostic (do not assume or mention any specific target job), but personalize the summary based entirely on the CV\'s content. Include: most recent roles/titles and seniority/years, core skills and tools, relevant domains/industries, notable achievements or certifications, education or languages if present, and any location/work-arrangement hints. Exclude personal contact details (phone, email, address), IDs, and sensitive numbers. No markdown, no bullet points, no headings.</task>',
    '',
    '<cv_text>',
    safe,
    '</cv_text>',
    '',
    '<output>Return only the summary text, nothing else.</output>'
  ].join('\n');
  return { system, user };
}

 
