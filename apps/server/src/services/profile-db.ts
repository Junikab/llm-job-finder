import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import type { CVAnalysis, Profile } from '@shared/types';
import { safeFileName, shortHash } from '../lib/job-keys.js';

/** Directory helper: ensure the profiles directory exists and return its path */
async function ensureProfilesDir(baseDir: string): Promise<string> {
  const dir = path.join(baseDir, 'profiles');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Build a stable filename for a profile id */
function profileFilePath(dir: string, id: string): string {
  const base = safeFileName(id || 'profile');
  return path.join(dir, `${base}_${shortHash(id || base)}.json`);
}

/** Read and parse JSON file safely */
async function readJson<T = any>(filePath: string): Promise<T | null> {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Persist JSON with pretty formatting */
async function writeJson(filePath: string, obj: any): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

export type ProfileInput = {
  id?: string;
  label?: string | null;
  analysis: CVAnalysis;
};

/** Create or update a profile. If id is omitted, a new profile is created. */
export async function saveProfile(reqId: string, baseDir: string, input: ProfileInput): Promise<Profile> {
  const dir = await ensureProfilesDir(baseDir);
  const id = (input.id && String(input.id).trim()) || randomUUID();
  const now = new Date().toISOString();
  const file = profileFilePath(dir, id);

  let existing: Profile | null = await readJson<Profile>(file);
  if (!existing) {
    existing = {
      id,
      label: input.label ?? null,
      analysis: input.analysis,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    };
  } else {
    existing.label = input.label ?? existing.label ?? null;
    existing.analysis = input.analysis;
    existing.updatedAt = now;
  }

  // annotate with reqId (not stored in type but helpful to track in file)
  const toStore: any = { ...existing, reqId };
  await writeJson(file, toStore);
  return existing;
}

/** Touch lastUsedAt field for a profile */
export async function touchProfile(baseDir: string, id: string): Promise<boolean> {
  const dir = await ensureProfilesDir(baseDir);
  const file = profileFilePath(dir, id);
  const p = await readJson<any>(file);
  if (!p) return false;
  p.lastUsedAt = new Date().toISOString();
  await writeJson(file, p);
  return true;
}

/** Get a profile by id */
export async function getProfile(baseDir: string, id: string): Promise<Profile | null> {
  const dir = await ensureProfilesDir(baseDir);
  const file = profileFilePath(dir, id);
  const p = await readJson<any>(file);
  if (!p) return null;
  const { reqId, ...rest } = p;
  return rest as Profile;
}

/** List all profiles */
export async function listProfiles(baseDir: string): Promise<Profile[]> {
  const dir = await ensureProfilesDir(baseDir);
  let entries: any[] = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {}
  const out: Profile[] = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.json')) continue;
    const p = await readJson<any>(path.join(dir, e.name));
    if (!p) continue;
    const { reqId, ...rest } = p;
    out.push(rest as Profile);
  }
  // sort by updatedAt desc
  out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return out;
}
