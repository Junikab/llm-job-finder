import React from 'react';
import '../styles/AnalysisHeader.css';
import type { CVAnalysis } from '../../../server/src/types';

export default function AnalysisHeader({ analysis, searchUrls, llmGoodTraits, llmBadTraits, llmPromptUserPreview, llmPromptSystem }: { analysis: CVAnalysis | null; searchUrls: string[]; llmGoodTraits?: string; llmBadTraits?: string; llmPromptUserPreview?: string; llmPromptSystem?: string; }) {
  if (!analysis) return null;

  const promptHeader = (llmPromptUserPreview && llmPromptUserPreview.trim().length > 0)
    ? llmPromptUserPreview
    : 'Prompt preview unavailable.';

  // Show first 5 lines by default; allow expanding to full prompt
  const [showFullPrompt, setShowFullPrompt] = React.useState(false);
  const previewLineLimit = 5;
  const promptLines = promptHeader.split('\n');
  const isTruncatable = promptLines.length > previewLineLimit;
  const visiblePrompt = showFullPrompt ? promptHeader : promptLines.slice(0, previewLineLimit).join('\n');

  return (
    <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      <strong>LLM prompt {llmPromptUserPreview ? '(exact preview)' : 'header'}:</strong>
      {llmPromptSystem && (
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, marginTop: 6, padding: 10, background: '#f1f5f9', borderRadius: 8, border: '1px solid #eee', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#111' }}>{llmPromptSystem}</pre>
      )}
      <div className="promptContainer">
        <pre id="llm-prompt-preview" className="promptPre">{visiblePrompt}</pre>
        {isTruncatable && !showFullPrompt && (
          <div className="fadeOverlay" aria-hidden="true" />
        )}
        {isTruncatable && (
          <button
            type="button"
            className="toggleButton"
            onClick={() => setShowFullPrompt(v => !v)}
            aria-expanded={showFullPrompt}
            aria-controls="llm-prompt-preview"
          >
            {showFullPrompt ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>
      {analysis.titles?.length ? (
        <div style={{ marginTop: 6, color: '#555' }}><strong>Titles:</strong> {analysis.titles.join(', ')}</div>
      ) : null}
      {analysis.topSkills?.length ? (
        <div style={{ marginTop: 6, color: '#555' }}><strong>Top skills:</strong> {analysis.topSkills.join(', ')}</div>
      ) : null}
      {analysis.locationHints?.length ? (
        <div style={{ marginTop: 6, color: '#555' }}><strong>Location hints:</strong> {analysis.locationHints.join(', ')}</div>
      ) : null}
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
