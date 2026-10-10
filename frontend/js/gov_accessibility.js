/**
 * Government Portal Accessibility & Universal Controls
 * Implements Ministry Web Standard Font Sizing (A- / A / A+) and Portal Sync
 */

(function() {
  const STORAGE_KEY = 'gov_portal_font_scale';
  let currentScale = parseFloat(localStorage.getItem(STORAGE_KEY) || '1');

  function applyFontScale(scale) {
    currentScale = Math.min(1.25, Math.max(0.85, scale));
    document.documentElement.style.setProperty('--gov-font-scale', currentScale);
    localStorage.setItem(STORAGE_KEY, currentScale.toString());

    // Update active state on buttons if present
    const btnAminus = document.getElementById('btn-font-dec');
    const btnAreset = document.getElementById('btn-font-reset');
    const btnAplus = document.getElementById('btn-font-inc');

    if (btnAreset) {
      if (Math.abs(currentScale - 1) < 0.02) {
        btnAreset.style.background = 'rgba(59, 130, 246, 0.3)';
        btnAreset.style.color = '#fff';
      } else {
        btnAreset.style.background = 'transparent';
        btnAreset.style.color = 'var(--gov-text-secondary)';
      }
    }
  }

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    applyFontScale(currentScale);

    const btnAminus = document.getElementById('btn-font-dec');
    const btnAreset = document.getElementById('btn-font-reset');
    const btnAplus = document.getElementById('btn-font-inc');

    if (btnAminus) {
      btnAminus.addEventListener('click', () => applyFontScale(currentScale - 0.08));
    }
    if (btnAreset) {
      btnAreset.addEventListener('click', () => applyFontScale(1.0));
    }
    if (btnAplus) {
      btnAplus.addEventListener('click', () => applyFontScale(currentScale + 0.08));
    }

    // NE-LENS Right Column Tab Switcher
    const nelensTabBtns = document.querySelectorAll('.nelens-tab-btn');
    nelensTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        nelensTabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.nelens-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-nelens-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  }
})();
