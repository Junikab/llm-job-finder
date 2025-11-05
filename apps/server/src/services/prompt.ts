import type { CVAnalysis, JobItem } from '@shared/types';

// Single source of truth for the LLM scoring system message
export const LLM_SCORING_SYSTEM = 'You score job relevance precisely. Return strictly valid JSON only.';

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
export function buildJobRelevancePromptUnified(
  analysis: Pick<CVAnalysis, 'summary'> & Partial<Pick<CVAnalysis, 'titles' | 'topSkills'>>,
  job: JobItem | null,
  opts: { redactJob?: boolean } = {}
): { system: string; user: string } {
  const summary = (analysis.summary ?? '').trim();
  const goodTraits = (process.env.LLM_GOOD_TRAITS || '').trim();
  const badTraits = (process.env.LLM_BAD_TRAITS || '').trim();
  const redact = !!opts.redactJob;
  const userParts: string[] = [
    'You are an expert job relevance scorer. Output strictly valid JSON with two fields only.',
    '',
    '<candidate>',
    'Candidate profile (CV summary):',
    summary.length > 0 ? summary : '(empty)',
    '',
    'Structured profile hints (optional):',
    ...(Array.isArray(analysis.titles) && analysis.titles.length
      ? [`Titles: ${analysis.titles.join(', ')}`]
      : []),
    ...(Array.isArray(analysis.topSkills) && analysis.topSkills.length
      ? [`Top skills: ${analysis.topSkills.join(', ')}`]
      : []),
    ...(goodTraits || badTraits ? ['', 'Compact prompt customization (optional):'] : []),
    ...(goodTraits ? [`Good traits: ${goodTraits}`] : []),
    ...(badTraits ? [`Bad traits: ${badTraits}`] : []),
    '</candidate>',
    '',
    '<rubric>',
    'Scoring rubric (apply cumulatively, 0–100 scale):',
    'Scoring method',
    '- Compute sub-scores per category below and sum to a total (0–100). Clamp to 0–100.',
    '- Base your judgment only on the candidate summary and job details. Do not guess or add facts.',
    '',
    'Weights',
    '- Role & seniority match (0–25)',
    '- Skills & tools match (0–35)',
    '- Domain & responsibilities (0–10)',
    '- Growth & learning opportunities (0–5)',
    '- Location & work arrangement (0–10)',
    '- Experience & qualifications (0–10)',
    '',
    'Category guidance',
    '- Role & seniority match (0–25)',
    '  - 25: Title/scope clearly matches candidate’s target role/seniority.',
    '  - 10–20: Partial overlap or adjacent role.',
    '  - 0–5: Mismatch (e.g., managerial-only for an IC, or unrelated function).',
    '',
    '- Skills & tools match (0–35)',
    '  - 30–35: Strong overlap on primary technologies/tools.',
    '  - 10–25: Some overlap; important gaps or many unknowns.',
    '  - 0–5: Mostly unrelated tech.',
    '',
    '- Domain & responsibilities (0–10)',
    '  - 8–10: Core duties align with candidate’s focus (e.g., building web UI for a frontend engineer).',
    '  - 3–7: Mixed duties or only partial alignment.',
    '  - 0–2: Unrelated domain (e.g., sales/ops for an engineering candidate).',
    '',
    '- Growth & learning opportunities (0–5)',
    '  - 4–5: Mentorship/training/career progression explicitly mentioned.',
    '  - 1–3: Some hints of learning opportunities.',
    '  - 0: None mentioned.',
    '',
    '- Location & work arrangement (0–10)',
    '  - 8–10: Matches candidate’s stated preference (or acceptable commute); remote/hybrid bonus if acceptable.',
    '  - 3–7: Acceptable but not ideal.',
    '  - 0–2: Impractical commute or conflicts with stated preferences.',
    '',
    '- Experience & qualifications (0–10)',
    '  - 8–10: Years/requirements align with candidate’s background.',
    '  - 3–7: Slightly above/below but plausible.',
    '  - 0–2: Demands substantially more than candidate has (unless explicitly open to “all levels”).',
    '',
    'Relevance filter',
    '- If the role is clearly outside the candidate’s goals (e.g., non-developer role for a developer), assign a very low total (0–5).',
    '',
    'Reason style (for the JSON "reason" field)',
    '- 10–20 words. Name 1–2 decisive factors (e.g., “Strong React/TS match; senior-only role lowers fit”).',
    '- No personal data; do not copy long job text; be concise and specific.',
    '</rubric>',
    '',
    '<examples>',
    'Calibration examples (concise):',
    'Highly relevant (80–95): Title and responsibilities closely match target; strong skill/tool overlap; mentorship/training present.',
    'Good match (60–79): Adjacent role with significant overlap; some gaps but learnable; location acceptable.',
    'Borderline (20–40): Mixed or mismatched responsibilities; major skill gaps; seniority higher than candidate.',
    'Low relevance (5–15): Unrelated domain or function compared to candidate’s goals.',
    'Irrelevant (0): Clearly outside candidate’s stated goals (e.g., non-technical for an engineering candidate).',
    '</examples>',
    '',
    '<task>',
    'Now score the job below from 0 to 100. Return strictly valid JSON with no extra text:',
    '{"score": <integer 0-100>, "reason": "<10-20 words explaining the main factors>"}',
    '</task>',
    '',
    '<job>',
  ];
  if (redact || !job) {
    userParts.push('Job details hidden in this preview. The model used the full title, company, location, URL, and description to score.');
  } else {
    const jobBlock = formatJobForPrompt(job);
    userParts.push('Job details:');
    userParts.push(jobBlock);
  }
  userParts.push('</job>');
  userParts.push('', '<answer>', 'Respond with JSON only, no extra text or backticks.', '</answer>');
  return { system: LLM_SCORING_SYSTEM, user: userParts.join('\n') };
}

export function buildJobRelevancePrompt(analysis: Pick<CVAnalysis, 'summary'> & Partial<Pick<CVAnalysis, 'titles' | 'topSkills'>>, job: JobItem): string {
  return buildJobRelevancePromptUnified(analysis, job, { redactJob: false }).user;
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

/**
 * Build a prompt that extracts structured fields from a CV as JSON.
 * Returns strictly valid JSON with: {"titles": string[], "topSkills": string[], "locationHints": string[]}
 */
export function buildCVAnalysisExtractPrompt(cvText: string): { system: string; user: string } {
  const system = 'You extract structured candidate profile fields from a CV and return strictly valid JSON only.';
  const safe = (cvText || '').slice(0, 6000);
  const user = [
    '<task>From the CV below, extract three arrays: titles (up to 3 concise role titles the candidate fits), topSkills (up to 8 concise domain-relevant skills/tools/techniques), and locationHints (up to 3 concise locations or regions). Prioritize explicit information from the CV; do not guess. Be role-agnostic (works for any profession). Include concrete items (e.g., "wedding bouquets", "vendor coordination", "flower care" for a florist; or "React", "TypeScript" for a developer). Avoid generic words like "next", "rest", or single letters. Deduplicate and use 1–3 words per item. Exclude personal contact details or identifiers.</task>',
    '',
    '<cv_text>',
    safe,
    '</cv_text>',
    '',
    '<output>Return strictly valid JSON only with this exact shape: {"titles": string[], "topSkills": string[], "locationHints": string[]}. No extra text.</output>'
  ].join('\n');
  return { system, user };
}

/**
 * Build a UI-safe preview of the LLM scoring prompt that matches the actual structure
 * but with the per-job <job> section redacted. Return both system and user strings.
 */
export function buildJobRelevancePromptPreview(analysis: Pick<CVAnalysis, 'summary'> & Partial<Pick<CVAnalysis, 'titles' | 'topSkills'>>): { system: string; user: string } {
  return buildJobRelevancePromptUnified(analysis, null, { redactJob: true });
}
