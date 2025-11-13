import React from 'react';

import '../styles/AnalysisHeader.css';

export type InfoBubbleProps = {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  bubbleId?: string;
  buttonLabel?: React.ReactNode;
};

export function InfoBubble({ ariaLabel, children, className, buttonClassName, bubbleId, buttonLabel = 'i' }: InfoBubbleProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const autoId = React.useId();
  const id = bubbleId || `info-${autoId}`;

  React.useEffect(() => {
    function onDocPointer(e: Event) {
      if (!open) return;
      const t = e.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
    };
  }, [open]);

  return (
    <span className={["linksRow__infoWrap", className].filter(Boolean).join(' ')} ref={ref}>
      <button
        type="button"
        className={["infoBubbleBtn", buttonClassName].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
      >
        {buttonLabel}
      </button>
      {open && (
        <div id={id} className="infoBubble" role="dialog">
          {children}
        </div>
      )}
    </span>
  );
}
