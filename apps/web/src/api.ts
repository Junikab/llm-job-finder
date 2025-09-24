// Simple API client wrappers to make App.tsx easier to test

const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL) ?? '').trim();

async function fetchJson(input: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${input}`, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function findJobs(form: FormData): Promise<any> {
  return fetchJson('/api/jobs/find', { method: 'POST', body: form });
}

export async function listSavedJobs(): Promise<any[]> {
  const data = await fetchJson('/api/db/jobs');
  return Array.isArray(data?.results) ? data.results : [];
}

export async function sendFeedback(jobId: string, userScore: number): Promise<void> {
  await fetchJson('/api/db/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, userScore }),
  });
}

export async function sendApplied(jobId: string, applied: boolean): Promise<void> {
  await fetchJson('/api/db/applied', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, applied }),
  });
}

export { API_BASE };

// New: rescore previously fetched jobs using a user-edited analysis
import type { CVAnalysis, JobItem, RankedJob } from '@shared/types';

export type RescoreResponse = {
  results: RankedJob[];
  total: number;
  llmPromptUserPreview?: string;
  llmPromptSystem?: string;
  searchUrls?: string[];
};

export async function rescoreJobs(
  analysis: CVAnalysis,
  jobs: JobItem[],
  opts?: { refreshSearch?: boolean; location?: string; days?: number }
): Promise<RescoreResponse> {
  const data = await fetchJson('/api/jobs/rescore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis, jobs, ...(opts || {}) }),
  });
  return {
    results: Array.isArray(data?.results) ? (data.results as RankedJob[]) : [],
    total: typeof data?.total === 'number' ? data.total : Number(data?.total || 0) || 0,
    llmPromptUserPreview: typeof data?.llmPromptUserPreview === 'string' ? data.llmPromptUserPreview : undefined,
    llmPromptSystem: typeof data?.llmPromptSystem === 'string' ? data.llmPromptSystem : undefined,
    searchUrls: Array.isArray(data?.searchUrls) ? (data.searchUrls as string[]) : undefined,
  };
}
