// Simple API client wrappers to make App.tsx easier to test
import {
  ZFindJobsResponse,
  ZSavedJobsResponse,
  ZRescoreResponse,
  ZProfile,
  ZProfilesResponse,
  type FindJobsResponse,
  type RescoreResponseZ,
} from './api-schemas';

import type { CVAnalysis, JobItem, Profile, RankedJob, SavedJob } from '@shared/types';

type FindJobsResponseUI = Omit<FindJobsResponse, 'results'> & { results: RankedJob[] };

const API_BASE = (((import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ?? '').trim();

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
  const parsed = ZProfilesResponse.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.results as Profile[];
}

/**
 * Get a profile by id; returns null if not found.
 */
export async function getProfile(id: string): Promise<Profile | null> {
  try {
    const data = await fetchJson(`/api/profiles/${encodeURIComponent(id)}`);
    const parsed = ZProfile.safeParse(data);
    return parsed.success ? (parsed.data as Profile) : null;
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
  const parsed = ZProfile.safeParse(data);
  if (!parsed.success) throw new Error('Invalid profile response');
  return parsed.data as Profile;
}

export async function findJobs(form: FormData, signal?: AbortSignal): Promise<FindJobsResponseUI> {
  const data = await fetchJson('/api/jobs/find', { method: 'POST', body: form, signal });
  const parsed = ZFindJobsResponse.safeParse(data);
  if (!parsed.success) throw new Error('Invalid findJobs response');
  const r = parsed.data;
  return { ...r, results: r.results.map(j => ({ ...j, key: j.key ?? j.id })) };
}

export async function listSavedJobs(signal?: AbortSignal): Promise<SavedJob[]> {
  const data = await fetchJson('/api/db/jobs', { signal });
  const parsed = ZSavedJobsResponse.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.results as SavedJob[];
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
export type RescoreResponse = Omit<RescoreResponseZ, 'results'> & { results: RankedJob[] };

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
  const parsed = ZRescoreResponse.safeParse(data);
  if (!parsed.success) throw new Error('Invalid rescoreJobs response');
  const r = parsed.data;
  return { ...r, results: r.results.map(j => ({ ...j, key: j.key ?? j.id })) };
}
