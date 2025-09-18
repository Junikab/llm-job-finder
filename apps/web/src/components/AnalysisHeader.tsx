import React from 'react';
import type { CVAnalysis } from '../../../server/src/types';

export default function AnalysisHeader({ analysis, searchUrls, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem }: { analysis: CVAnalysis | null; searchUrls: string[]; llmGoodTraits?: string; llmBadTraits?: string; llmPromptUserPreview?: string; llmPromptSystem?: string; }) {
  if (!analysis) return null;

  const good = (llmGoodTraits || '').trim();
  const bad = (llmBadTraits || '').trim();
  const summary = (analysis.summary || '').trim();
  const lines: string[] = [
    'You are an expert job relevance scorer. Output strictly valid JSON with two fields only.',
    '',
    'Candidate profile (CV summary):',
    summary.length > 0 ? summary : '(empty)',
  ];
  if (good || bad) {
    lines.push('', 'Compact prompt customization (optional):');
    if (good) lines.push(`Good traits: ${good}`);
    if (bad) lines.push(`Bad traits: ${bad}`);
  }
  lines.push(
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
    'Now score the job below from 0 to 100. Return strictly valid JSON with no extra text:',
    '{"score": <integer 0-100>, "reason": "<10-20 words explaining the main factors>"}',
  );

  const promptHeader = (llmPromptUserPreview && llmPromptUserPreview.trim().length > 0) ? llmPromptUserPreview : lines.join('\n');

  return (
    <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      <strong>LLM prompt {llmPromptUserPreview ? '(exact preview)' : 'header'}:</strong>
      {llmPromptSystem && (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, marginTop: 6, padding: 10, background: '#f1f5f9', borderRadius: 8, border: '1px solid #eee', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#111' }}>{llmPromptSystem}</pre>
      )}
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, marginTop: 6, padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #eee', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#111' }}>{promptHeader}</pre>
      <div style={{ marginTop: 6, color: '#555' }}><strong>Titles:</strong> {analysis.titles?.join(', ')}</div>
      <div style={{ marginTop: 6, color: '#555' }}><strong>Top skills:</strong> {analysis.topSkills?.join(', ')}</div>
      {!!(searchUrls?.length) && (
        <div style={{ marginTop: 6 }}>
          <strong>Search URLs:</strong> {searchUrls.map((u: string) => {
            try {
              const q = new URL(u).searchParams.get('q') || u;
              return (<a key={u} href={u} target="_blank" style={{ marginLeft: 8 }}>{q}</a>);
            } catch {
              return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
