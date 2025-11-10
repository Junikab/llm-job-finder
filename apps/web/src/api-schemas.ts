import { z } from 'zod';

// Core entities (runtime validation)
export const ZCVAnalysis = z.object({
  summary: z.string(),
  titles: z.array(z.string()).default([]),
  topSkills: z.array(z.string()).default([]),
  niceToHave: z.array(z.string()).optional(),
  locationHints: z.array(z.string()).optional(),
  worldwide: z.boolean().optional(),
  manualSearchUrl: z.string().optional(),
});

const ZMaybeStr = z.preprocess((v) => (v == null ? undefined : v), z.string().optional());

export const ZJobItem = z.object({
  id: z.string(),
  title: z.string(),
  company: ZMaybeStr,
  location: ZMaybeStr,
  url: z.string(),
  listedAgo: ZMaybeStr,
  description: ZMaybeStr,
});

export const ZRankedJob = ZJobItem.extend({
  key: z.string().optional(),
  score: z.number(),
  reason: z.string(),
});

export const ZSavedJob = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  listedAgo: z.string().nullable().optional(),
  modelScore: z.number().nullable().optional(),
  userScore: z.number().nullable().optional(),
  applied: z.boolean().nullable().optional(),
  appliedAt: z.string().nullable().optional(),
  saved: z.boolean().nullable().optional(),
  savedAt: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  source: z.string(),
  data: z.unknown().optional(),
});

export const ZProfile = z.object({
  id: z.string(),
  label: z.string().nullable(),
  analysis: ZCVAnalysis,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().nullable(),
});

// Responses
export const ZFindJobsResponse = z.object({
  analysis: ZCVAnalysis,
  searchUrls: z.array(z.string()).optional(),
  total: z.number().optional(),
  results: z.array(ZRankedJob),
  llmPromptUserPreview: z.string().optional(),
  llmPromptSystem: z.string().optional(),
  llmGoodTraits: z.string().optional(),
  llmBadTraits: z.string().optional(),
});

export const ZRescoreResponse = z.object({
  results: z.array(ZRankedJob),
  total: z.number(),
  llmPromptUserPreview: z.string().optional(),
  llmPromptSystem: z.string().optional(),
  searchUrls: z.array(z.string()).optional(),
});

export const ZSavedJobsResponse = z.object({
  total: z.number(),
  results: z.array(ZSavedJob),
});

export const ZProfilesResponse = z.object({
  results: z.array(ZProfile),
  total: z.number().optional(),
});

export type FindJobsResponse = z.infer<typeof ZFindJobsResponse>;
export type RescoreResponseZ = z.infer<typeof ZRescoreResponse>;
export type SavedJobsResponse = z.infer<typeof ZSavedJobsResponse>;
export type ProfilesResponse = z.infer<typeof ZProfilesResponse>;
