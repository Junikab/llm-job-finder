import { buildJobRelevancePrompt, parseRelevanceScore } from '../services/prompt.js';
import type { JobItem } from '../types.js';

// Mock CV analysis summary
const analysis = {
  summary: 'Senior frontend engineer with 7+ years experience in React, TypeScript, Node.js, and modern tooling. Strong focus on UI/UX and testing.',
};

// Mock Job data
const job: JobItem = {
  id: 'demo-job-1',
  title: 'Frontend Developer (React/TypeScript)',
  company: 'Acme Corp',
  location: 'Sydney NSW',
  url: 'https://example.com/jobs/frontend-developer',
  listedAgo: '3 days ago',
  description: [
    'We are seeking a Frontend Developer experienced with React and TypeScript.',
    'Responsibilities include building responsive UIs, collaborating with designers, and writing tests.',
    'Bonus: experience with Node.js, Playwright, and GraphQL.',
  ].join(' '),
};

const prompt = buildJobRelevancePrompt(analysis, job);

console.log('===== LLM Prompt =====');
console.log(prompt);

// Optional: demonstrate parsing a mocked LLM response
const mockLlmResponse = '87';
const parsed = parseRelevanceScore(mockLlmResponse);
console.log('\n===== Parsed Score (from mocked response "87") =====');
console.log(parsed);
