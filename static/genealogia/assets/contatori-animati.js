/* Radici di Calabria · Contatori a scorrimento.
   Non cambia home.js, comuni.js o dati genealogici.
   I numeri partono da zero solo quando il riepilogo è visibile.
   Dopo una ricerca/filtro animano nuovamente i valori aggiornati.
   Compatibile con il selettore lingua IT/EN e con reduced motion. */
(() => {
  'use strict';

  function boot() {
    const grid = document.getElementById('summaryGrid');
    if (!grid) return;

    const formatter = () => new Intl.NumberFormat(
      (window.RADICI_I18N?.lang || document.documentElement.lang || 'it').toLowerCase().startsWith('en')
        ? 'en-US' : 'it-IT'
    );
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows = new Map();
    let inViewport = false;
    const DURATION = 1850;

    function parseWholeNumber(text) {
      const value = (text || '').trim();
      if (!/^(?:\d+|\d{1,3}(?:[.,]\d{3})+)$/.test(value)) return null;
      const number = Number(value.replace(/[.,]/g, ''));
      return Number.isSafeInteger(number) && number >= 0 ? number : null;
    }

    function write(row, value) {
      // nodeValue evita di generare nuovi elementi nel riepilogo, e non provoca
      // il MutationObserver che monitora esclusivamente le schede dirette.
      row.text.nodeValue = formatter().format(value);
    }

    function end(row) {
      if (row.raf) cancelAnimationFrame(row.raf);
      row.raf = 0;
      write(row, row.target);
    }

    function animate(row) {
      if (row.raf) cancelAnimationFrame(row.raf);
      row.raf = 0;
      if (reduceMotion || row.target === 0) { write(row, row.target); return; }
      write(row, 0);
      const start = performance.now();
      const tick = now => {
        if (!row.node.isConnected) { row.raf = 0; return; }
        const progress = Math.min(1, (now - start) / DURATION);
        const eased = 1 - Math.pow(1 - progress, 3);
        write(row, Math.round(row.target * eased));
        if (progress < 1) row.raf = requestAnimationFrame(tick);
        else { row.raf = 0; write(row, row.target); }
      };
      row.raf = requestAnimationFrame(tick);
    }

    function scan() {
      // home.js rigenera le sei schede ad ogni ricerca/filtro.
      for (const row of rows.values()) if (row.raf) cancelAnimationFrame(row.raf);
      rows.clear();
      grid.querySelectorAll('.summary-value').forEach((node, index) => {
        const target = parseWholeNumber(node.textContent);
        if (target === null) return; // Il periodo 1710–2025 non è un contatore.
        node.setAttribute('data-i18n-skip', ''); // Formattazione numerica gestita qui.
        const text = node.firstChild?.nodeType === Node.TEXT_NODE
          ? node.firstChild : node.appendChild(document.createTextNode(''));
        const row = { node, target, text, raf: 0 };
        rows.set(index, row);
        if (inViewport) animate(row);
        else write(row, target);
      });
    }

    // Il riepilogo è creato da home.js; osserviamo solo le schede dirette.
    const observer = new MutationObserver(records => {
      if (records.some(r => r.type === 'childList' && r.target === grid)) scan();
    });
    observer.observe(grid, { childList: true });
    scan();

    const section = grid.closest('.summary-section') || grid;
    if ('IntersectionObserver' in window) {
      const visibility = new IntersectionObserver(entries => {
        const isVisible = entries.some(e => e.isIntersecting);
        if (isVisible && !inViewport) {
          inViewport = true;
          for (const row of rows.values()) animate(row);
        } else if (!isVisible) {
          inViewport = false;
          for (const row of rows.values()) end(row);
        }
      }, { threshold: 0.12 });
      visibility.observe(section);
    } else {
      inViewport = true;
      for (const row of rows.values()) animate(row);
    }

    window.addEventListener('radici:languagechange', () => {
      // Il contatore conserva la cifra, ma aggiorna il separatore delle migliaia.
      for (const row of rows.values()) if (!row.raf) write(row, row.target);
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
