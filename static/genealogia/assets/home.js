(() => {
  'use strict';
  const towns = (window.RADICI_COMUNI || []).map(t => ({ ...t, ready: Boolean(t.url || t.ready), checked: Boolean(t.url || t.ready) }));
  let province = 'all';
  let searchTerm = '';
  const grid = document.getElementById('townGrid');
  const filters = document.getElementById('provinceFilters');
  const count = document.getElementById('resultCount');
  const empty = document.getElementById('emptyResults');
  const $ = id => document.getElementById(id);
  $('year').textContent = new Date().getFullYear();
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    a.href = `rete.html?comune=${encodeURIComponent(town.slug)}`;
    a.setAttribute('aria-label', `${town.nome}, ${town.ready ? 'esplora rete' : 'rete in preparazione'}`);

    // Dati dell'archivio, mostrati solo quando disponibili nel catalogo.
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
    const filtered = towns.filter(t => (province === 'all' || t.sigla === province) && (`${t.nome} ${t.provincia}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(searchTerm)));
    grid.replaceChildren(); filtered.forEach((t, i) => grid.appendChild(card(t, i)));
    count.textContent = `${filtered.length} ${filtered.length === 1 ? 'località' : 'località'}`;
    empty.hidden = filtered.length > 0;
  }
  $('townSearch').addEventListener('input', e => { searchTerm = e.target.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); render(); });
  const navToggle = $('navToggle');
  navToggle.addEventListener('click', () => { const nav = $('mobileNav'); nav.hidden = !nav.hidden; navToggle.setAttribute('aria-expanded', String(!nav.hidden)); });
  document.querySelectorAll('.mobile-nav a').forEach(a => a.addEventListener('click', () => { $('mobileNav').hidden = true; navToggle.setAttribute('aria-expanded', 'false'); }));
  renderFilters(); render();
  async function detect(town) {
    if (town.url || town.ready) return;
    if (location.protocol === 'file:') return;
    try { const resp = await fetch(`reti/${encodeURIComponent(town.slug)}/index.html`, { method: 'HEAD', cache: 'no-store' }); town.ready = resp.ok && (resp.headers.get('content-type') || '').includes('text/html'); town.checked = true; }
    catch { town.ready = false; town.checked = true; }
  }
  Promise.all(towns.map(detect)).then(render);
})();
