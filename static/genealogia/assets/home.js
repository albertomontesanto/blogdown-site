(() => {
  'use strict';
  const towns = (window.RADICI_COMUNI || []).map(t => ({ ...t, ready: Boolean(t.url || t.ready), checked: Boolean(t.url || t.ready) }));
  let province = 'all';
  let searchTerm = '';
  const grid = document.getElementById('townGrid');
  const filters = document.getElementById('provinceFilters');
  const count = document.getElementById('resultCount');
  const empty = document.getElementById('emptyResults');
  const summaryGrid = document.getElementById('summaryGrid');
  const summaryNote = document.getElementById('summaryNote');
  const $ = id => document.getElementById(id);
  $('year').textContent = new Date().getFullYear();
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const formatNumber = value => Number(value || 0).toLocaleString('it-IT');

  function parsePeriod(period) {
    const years = String(period || '').match(/\d{4}/g);
    if (!years || !years.length) return null;
    const nums = years.map(Number).filter(Number.isFinite);
    if (!nums.length) return null;
    return { start: Math.min(...nums), end: Math.max(...nums) };
  }

  function buildSummary(filtered) {
    const ready = filtered.filter(t => t.ready);
    const people = ready.reduce((acc, t) => acc + (Number(t.persone) || 0), 0);
    const families = ready.reduce((acc, t) => acc + (Number(t.famiglie) || 0), 0);
    const events = ready.reduce((acc, t) => acc + (Number(t.eventi) || 0), 0);
    const provinces = new Set(ready.map(t => t.sigla).filter(Boolean)).size;
    const periods = ready.map(t => parsePeriod(t.periodo)).filter(Boolean);
    const minYear = periods.length ? Math.min(...periods.map(p => p.start)) : null;
    const maxYear = periods.length ? Math.max(...periods.map(p => p.end)) : null;
    return {
      readyCount: ready.length,
      people, families, events, provinces,
      periodLabel: minYear && maxYear ? `${minYear}–${maxYear}` : 'n.d.'
    };
  }

  function renderSummary(filtered) {
    if (!summaryGrid) return;
    const summary = buildSummary(filtered);
    const cards = [
      { value: formatNumber(summary.people), label: 'Individui totali' },
      { value: formatNumber(summary.families), label: 'Famiglie totali' },
      { value: formatNumber(summary.events), label: 'Eventi documentati' },
      { value: formatNumber(summary.readyCount), label: 'Portali consultabili' },
      { value: formatNumber(summary.provinces), label: 'Province coinvolte' },
      { value: safe(summary.periodLabel), label: 'Periodo documentato' }
    ];
    summaryGrid.innerHTML = cards.map(item => `
      <article class="summary-card">
        <div class="summary-value">${item.value}</div>
        <div class="summary-label">${safe(item.label)}</div>
      </article>`).join('');

    const townNames = filtered.map(t => t.nome);
    const label = filtered.length === towns.length
      ? 'Il riepilogo mostra i totali complessivi degli archivi presenti nel portale e si aggiorna automaticamente quando usi ricerca o filtri.'
      : `Il riepilogo si riferisce ai ${filtered.length} comuni attualmente visibili: ${safe(townNames.join(', '))}.`;
    if (summaryNote) summaryNote.textContent = label;
  }

  function renderFilters() {
    const provinces = [...new Map(towns.map(t => [t.sigla, t.provincia])).entries()];
    filters.replaceChildren();
    [['all', 'Tutte'], ...provinces.map(([sigla, name]) => [sigla, name])].forEach(([key, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (province === key ? ' active' : ''); b.textContent = label;
      b.setAttribute('aria-pressed', String(province === key));
      b.addEventListener('click', () => { province = key; renderFilters(); render(); }); filters.appendChild(b);
    });
  }

  function card(town, idx) {
    const a = document.createElement('a');
    a.className = `town-card town-card-archivio tone-${town.cover || 'terra'}`;
    a.href = town.url || (town.archivioPersonalizzato ? `esplora.html?comune=${encodeURIComponent(town.slug)}` : `rete.html?comune=${encodeURIComponent(town.slug)}`);
    a.setAttribute('aria-label', `${town.nome}, ${town.ready ? 'esplora rete' : 'rete in preparazione'}`);

    const facts = [
      ['Persone', town.persone != null ? Number(town.persone).toLocaleString('it-IT') : null],
      ['Famiglie', town.famiglie != null ? Number(town.famiglie).toLocaleString('it-IT') : null],
      ['Eventi', town.eventi != null ? Number(town.eventi).toLocaleString('it-IT') : null],
      ['Periodo', town.periodo || null]
    ].filter(([, value]) => value != null && value !== '');
    const details = facts.length
      ? `<dl class="town-facts">${facts.map(([key, value]) => `<div><dt>${safe(key)}</dt><dd>${safe(value)}</dd></div>`).join('')}</dl>`
      : `<div class="town-pending-note">Dati e relazioni familiari saranno consultabili dopo la pubblicazione dell'archivio.</div>`;

    a.innerHTML = `
      <div class="town-cover">
        <div class="town-cover-top"><span>ARCHIVIO GENEALOGICO</span><span class="town-number">SCHEDA ${String(idx + 1).padStart(2, '0')}</span></div>
        <div class="town-cover-identity">
          <span class="town-document" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5h11l5 5V28.5H8z"/><path d="M19 3.5v5h5M12 14h8M12 18h8M12 22h5"/></svg></span>
          <div><strong>CALABRIA · ${safe(town.sigla)}</strong><span>Provincia di ${safe(town.provincia)}</span></div>
        </div>
      </div>
      <div class="town-info">
        <div class="town-info-top"><span class="town-province">COLLEZIONE COMUNALE</span><span class="town-badge ${town.ready ? 'is-ready' : ''}">${town.ready ? 'Consultabile' : 'In preparazione'}</span></div>
        <h3>${safe(town.nome)}</h3>
        <p class="town-description">${safe(town.descrizione)}</p>
        ${details}
        <div class="town-bottom"><span>${town.ready ? 'Esplora la genealogia' : 'Scopri la rete'}</span><span class="town-link-arrow" aria-hidden="true">→</span></div>
      </div>`;
    return a;
  }

  function render() {
    const filtered = towns.filter(t => (province === 'all' || t.sigla === province) && normalizeText(`${t.nome} ${t.provincia}`).includes(searchTerm));
    grid.replaceChildren(); filtered.forEach((t, i) => grid.appendChild(card(t, i)));
    count.textContent = `${filtered.length} località`;
    empty.hidden = filtered.length > 0;
    renderSummary(filtered);
  }

  $('townSearch').addEventListener('input', e => { searchTerm = normalizeText(e.target.value.trim()); render(); });
  const navToggle = $('navToggle');
  navToggle.addEventListener('click', () => { const nav = $('mobileNav'); nav.hidden = !nav.hidden; navToggle.setAttribute('aria-expanded', String(!nav.hidden)); });
  document.querySelectorAll('.mobile-nav a').forEach(a => a.addEventListener('click', () => { $('mobileNav').hidden = true; navToggle.setAttribute('aria-expanded', 'false'); }));
  renderFilters(); render();

  async function detect(town) {
    if (town.url || town.ready) return;
    if (location.protocol === 'file:') return;
    try {
      const resp = await fetch(`reti/${encodeURIComponent(town.slug)}/index.html`, { method: 'HEAD', cache: 'no-store' });
      town.ready = resp.ok && (resp.headers.get('content-type') || '').includes('text/html'); town.checked = true;
    } catch { town.ready = false; town.checked = true; }
  }
  Promise.all(towns.map(detect)).then(render);
})();
