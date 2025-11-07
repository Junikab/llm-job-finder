// Simple API client wrappers to make App.tsx easier to test

const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL) ?? '').trim();

async function fetchJson(input: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${input}`, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// Profiles API
/**
 * List saved profiles.
 */
export async function listProfiles(): Promise<Profile[]> {
  const data = await fetchJson('/api/profiles');
  return Array.isArray(data?.results) ? (data.results as Profile[]) : [];
}

/**
 * Get a profile by id; returns null if not found.
 */
export async function getProfile(id: string): Promise<Profile | null> {
  try {
    const data = await fetchJson(`/api/profiles/${encodeURIComponent(id)}`);
    return (data as Profile) || null;
  } catch {
    return null;
  }
}

/**
 * Create or update a profile. If id is omitted, creates a new profile.
 */
export async function saveProfile(payload: { id?: string; label?: string; analysis: CVAnalysis }, signal?: AbortSignal): Promise<Profile> {
  const data = await fetchJson('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return data as Profile;
}

export async function findJobs(form: FormData, signal?: AbortSignal): Promise<any> {
  return fetchJson('/api/jobs/find', { method: 'POST', body: form, signal });
}

export async function listSavedJobs(signal?: AbortSignal): Promise<any[]> {
  const data = await fetchJson('/api/db/jobs', { signal });
  return Array.isArray(data?.results) ? data.results : [];
}

export async function sendFeedback(jobId: string, userScore: number, signal?: AbortSignal): Promise<void> {
  await fetchJson('/api/db/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, userScore }),
    signal,
  });
}

export async function sendApplied(jobId: string, applied: boolean, signal?: AbortSignal): Promise<void> {
  await fetchJson('/api/db/applied', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, applied }),
    signal,
  });
}

export async function sendSaved(jobId: string, saved: boolean, signal?: AbortSignal): Promise<void> {
  await fetchJson('/api/db/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, saved }),
    signal,
  });
}

export { API_BASE };

// New: rescore previously fetched jobs using a user-edited analysis
import type { CVAnalysis, JobItem, RankedJob, Profile } from '@shared/types';

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
  opts?: { refreshSearch?: boolean; location?: string; days?: number; searchUrl?: string; signal?: AbortSignal }
): Promise<RescoreResponse> {
  const data = await fetchJson('/api/jobs/rescore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis, jobs, ...(opts || {}) }),
    signal: opts?.signal,
  });
  return {
    results: Array.isArray(data?.results) ? (data.results as RankedJob[]) : [],
    total: typeof data?.total === 'number' ? data.total : Number(data?.total || 0) || 0,
    llmPromptUserPreview: typeof data?.llmPromptUserPreview === 'string' ? data.llmPromptUserPreview : undefined,
    llmPromptSystem: typeof data?.llmPromptSystem === 'string' ? data.llmPromptSystem : undefined,
    searchUrls: Array.isArray(data?.searchUrls) ? (data.searchUrls as string[]) : undefined,
  };
}
