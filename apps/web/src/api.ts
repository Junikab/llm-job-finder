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
