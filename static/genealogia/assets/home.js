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
    a.className = `town-card tone-${town.cover || 'terra'}`;
    a.href = `rete.html?comune=${encodeURIComponent(town.slug)}`;
    a.setAttribute('aria-label', `${town.nome}, ${town.ready ? 'esplora rete' : 'rete in preparazione'}`);
    a.innerHTML = `<div class="town-cover"><div class="town-decor" aria-hidden="true"><span class="arch arch1"></span><span class="arch arch2"></span><span class="arch arch3"></span></div><div class="town-cover-top"><span>CALABRIA · ${safe(town.sigla)}</span><span class="town-number">${String(idx + 1).padStart(2,'0')}</span></div><div class="town-cover-letter" aria-hidden="true">${safe(town.nome.charAt(0))}</div><div class="town-cover-bottom">${safe(town.provincia.toUpperCase())} <span>✳</span></div></div><div class="town-info"><div class="town-info-top"><span class="town-province">PROVINCIA DI ${safe(town.provincia.toUpperCase())}</span><span class="town-badge ${town.ready ? 'is-ready' : ''}">${town.ready ? 'Consultabile' : 'In preparazione'}</span></div><h3>${safe(town.nome)}</h3><p>${safe(town.descrizione)}</p>${town.persone ? `<div class="town-meta"><span>✳ ${Number(town.persone).toLocaleString('it-IT')} persone</span><span>⌁ ${Number(town.famiglie).toLocaleString('it-IT')} famiglie</span></div>` : ''}<div class="town-bottom"><span>${town.ready ? 'Esplora la genealogia' : 'Scopri la rete'}</span><span class="circle-arrow" aria-hidden="true">↗</span></div></div>`;
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
