import React from 'react';
import type { CVAnalysis } from '../../../server/src/types';

export default function AnalysisHeader({ analysis, searchUrls }: { analysis: CVAnalysis | null; searchUrls: string[] }) {
  if (!analysis) return null;
  return (
    <div style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      <strong>Detected summary:</strong>
      <div style={{ color: '#333' }}>{analysis.summary}</div>
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
