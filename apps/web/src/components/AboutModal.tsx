import React from 'react';

export default function AboutModal(props: { open: boolean; onClose: () => void }) {
  const { open, onClose } = props;
  if (!open) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={stop}
        style={{
          background: '#fff', borderRadius: 12, maxWidth: 720, width: '100%',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)', padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 id="about-title" style={{ margin: 0, fontSize: 20, color: '#222' }}>About</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '4px 8px', background: '#f7f7f7', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10, color: '#333' }}>
          <p style={{ margin: 0 }}>
            Looking for a faster way to find jobs that actually match your skills?
            <br/>
            Jora LLM Job Finder helps you cut through the noise.
          </p>

          <h3 style={{ fontSize: 16, margin: '8px 0 0', color: '#222' }}>How it works</h3>
          <ul style={{ margin: '6px 0 0 18px' }}>
            <li>Upload your CV (PDF, DOCX, or TXT).</li>
            <li>Pick your search — choose a location and how recent the jobs should be.</li>
            <li>Get ranked results — the app highlights jobs that fit your profile, so the best matches rise to the top.</li>
            <li>Click and apply — each job links directly to the original posting.</li>
          </ul>

          <h3 style={{ fontSize: 16, margin: '8px 0 0', color: '#222' }}>Why use it?</h3>
          <ul style={{ margin: '6px 0 0 18px' }}>
            <li>Smarter job search: no more endless scrolling — see the most relevant roles first.</li>
            <li>Private by design: your CV file is processed temporarily on the server to extract text, and neither the file nor extracted text is stored.</li>
            <li>Quick and simple: works out-of-the-box with basic scoring, with optional AI assistance for sharper matches.</li>
            <li>Stay organized: your last few CVs are saved locally so you can reuse them anytime.</li>
          </ul>

          <h3 style={{ fontSize: 16, margin: '8px 0 0', color: '#222' }}>What’s next</h3>
          <ul style={{ margin: '6px 0 0 18px' }}>
            <li>AI-powered re-ranking for even better matches.</li>
            <li>Editable CV summaries so you control how employers see you.</li>
            <li>Richer job details (salary, remote options, company info).</li>
          </ul>

          <p style={{ margin: 0, fontWeight: 600 }}>⚡ Find jobs faster. Focus on the ones that matter.</p>
        </div>
      </div>
    </div>
  );
}
