import React from 'react';
import '../styles/about-modal.css';

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = () => {
    onClose();
  };

  const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className="aboutModal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="aboutModal__dialog" onClick={stopPropagation}>
        <header className="aboutModal__header">
          <h2 id="about-modal-title" className="aboutModal__title">About</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="aboutModal__closeButton"
            onClick={onClose}
            aria-label="Close about modal"
          >
            ×
          </button>
        </header>

        <div className="aboutModal__content">
          <p className="aboutModal__highlight">
            Looking for a faster way to find jobs that actually match your skills?
            <br />
            Jora LLM Job Finder helps you cut through the noise.
          </p>

          <section>
            <h3 className="aboutModal__sectionHeading">How it works</h3>
            <ul className="aboutModal__list">
              <li>Upload your CV (PDF, DOCX, or TXT).</li>
              <li>Pick your search — choose a location and how recent the jobs should be.</li>
              <li>Get ranked results so the best matches rise to the top.</li>
              <li>Click and apply — each job links directly to the original posting.</li>
            </ul>
          </section>

          <section>
            <h3 className="aboutModal__sectionHeading">Why use it?</h3>
            <ul className="aboutModal__list">
              <li>Smarter job search: see the most relevant roles first.</li>
              <li>Private by design: CV text is processed temporarily and not stored.</li>
              <li>Quick and simple: optional AI assistance for sharper matches.</li>
              <li>Stay organized: your recent CVs stay on your device for reuse.</li>
            </ul>
          </section>

          <section>
            <h3 className="aboutModal__sectionHeading">What’s next</h3>
            <ul className="aboutModal__list">
              <li>AI-powered re-ranking for even better matches.</li>
              <li>Editable CV summaries so you control your profile.</li>
              <li>Richer job details (salary, remote options, company info).</li>
            </ul>
          </section>

          <p className="aboutModal__highlight">⚡ Find jobs faster. Focus on the ones that matter.</p>
        </div>
      </div>
    </div>
  );
}
