/* Lightweight global loader overlay injected via DOM.
   Usage: showGlobalLoader('Finding jobs…'); hideGlobalLoader(); */
import '../styles/loader.css';

const OVERLAY_ID = 'jora-global-loader';

// styles are provided by ../styles/loader.css

export function showGlobalLoader(text: string = 'Finding jobs…'): void {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('role', 'status');
    overlay.innerHTML = `
      <div class="jora-ldr-center">
        <div class="jora-ldr-pencil"><p></p><div class="jora-ldr-top"></div></div>
        <div class="jora-ldr-stroke"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  const p = overlay.querySelector('.jora-ldr-pencil p');
  if (p) p.textContent = text;
}

export function hideGlobalLoader(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  // Keep style tag to avoid FOUC on repeated toggles; remove if desired
}
