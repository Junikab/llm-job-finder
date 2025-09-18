import React from 'react';
import type { CVAnalysis } from '../../../server/src/types';

export default function AnalysisHeader({ analysis, searchUrls, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem }: { analysis: CVAnalysis | null; searchUrls: string[]; llmGoodTraits?: string; llmBadTraits?: string; llmPromptUserPreview?: string; llmPromptSystem?: string; }) {
  if (!analysis) return null;

  const promptHeader = (llmPromptUserPreview && llmPromptUserPreview.trim().length > 0)
    ? llmPromptUserPreview
    : 'Prompt preview unavailable.';

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
