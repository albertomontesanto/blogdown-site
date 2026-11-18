(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const demoGedcom = `0 HEAD
1 SOUR RADICI_CALABRIA_DEMO
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Giovanni /Ferraro/
1 SEX M
1 BIRT
2 DATE 12 JAN 1850
2 PLAC Località immaginaria
1 DEAT
2 DATE 3 MAY 1920
0 @I2@ INDI
1 NAME Maria /Caruso/
1 SEX F
1 BIRT
2 DATE 1854
0 @I3@ INDI
1 NAME Pietro /Ferraro/
1 SEX M
1 BIRT
2 DATE 1877
0 @I4@ INDI
1 NAME Teresa /Greco/
1 SEX F
1 BIRT
2 DATE 1880
0 @I5@ INDI
1 NAME Carmela /Ferraro/
1 SEX F
1 BIRT
2 DATE 1882
0 @I6@ INDI
1 NAME Andrea /Greco/
1 SEX M
1 BIRT
2 DATE 1858
0 @I7@ INDI
1 NAME Elena /Russo/
1 SEX F
1 BIRT
2 DATE 1860
0 @I8@ INDI
1 NAME Luigi /Ferraro/
1 SEX M
1 BIRT
2 DATE 1904
0 @I9@ INDI
1 NAME Rosa /Ferraro/
1 SEX F
1 BIRT
2 DATE 1907
0 @I10@ INDI
1 NAME Antonio /Ferraro/
1 SEX M
1 BIRT
2 DATE 1910
0 @I11@ INDI
1 NAME Angela /Marino/
1 SEX F
1 BIRT
2 DATE 1907
0 @I12@ INDI
1 NAME Mario /Ferraro/
1 SEX M
1 BIRT
2 DATE 1931
0 @I13@ INDI
1 NAME Lucia /Ferraro/
1 SEX F
1 BIRT
2 DATE 1935
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I5@
0 @F2@ FAM
1 HUSB @I6@
1 WIFE @I7@
1 CHIL @I4@
0 @F3@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I8@
1 CHIL @I9@
1 CHIL @I10@
0 @F4@ FAM
1 HUSB @I8@
1 WIFE @I11@
1 CHIL @I12@
1 CHIL @I13@
0 TRLR`;
  let persons = new Map(), families = new Map(), currentId = '', history = [], label = 'Rete dimostrativa';
  function parseGedcom(text) {
    const p = new Map(), f = new Map();
    let root = null, event = null, eventLevel = -1;
    const lines = text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([\w_]+)(?:\s+(.*))?$/);
      if (!m) continue;
      const level = +m[1], id = m[2], tag = m[3].toUpperCase(), value = (m[4] || '').trim();
      if (level === 0) {
        event = null;
        if (tag === 'INDI' && id) { root = { kind: 'person', id, name: '', sex: '', birth: {}, death: {}, occupation: '', famc: [], fams: [] }; p.set(id, root); }
        else if (tag === 'FAM' && id) { root = { kind: 'family', id, husband: '', wife: '', children: [] }; f.set(id, root); }
        else root = null;
        continue;
      }
      if (!root) continue;
      if (root.kind === 'person') {
        if (level === 1) {
          event = null; eventLevel = -1;
          if (tag === 'NAME') root.name = value;
          if (tag === 'SEX') root.sex = value;
          if (tag === 'FAMC' && value) root.famc.push(value);
          if (tag === 'FAMS' && value) root.fams.push(value);
          if (tag === 'OCCU') root.occupation = value;
          if (tag === 'BIRT') { event = root.birth; eventLevel = 1; }
          if (tag === 'DEAT') { event = root.death; eventLevel = 1; }
        } else if (level === 2 && event && eventLevel === 1) {
          if (tag === 'DATE') event.date = value;
          if (tag === 'PLAC') event.place = value;
          if (tag === 'GIVN') root.given = value;
          if (tag === 'SURN') root.surname = value;
        } else if (level === 2 && tag === 'GIVN') root.given = value;
        else if (level === 2 && tag === 'SURN') root.surname = value;
      } else if (root.kind === 'family' && level === 1) {
        if (tag === 'HUSB') root.husband = value;
        if (tag === 'WIFE') root.wife = value;
        if (tag === 'CHIL') root.children.push(value);
      }
    }
    // Link families and persons in both directions, allowing GEDCOMs without FAMC/FAMS tags.
    for (const family of f.values()) {
      [family.husband, family.wife].forEach(pid => { const person = p.get(pid); if (person && !person.fams.includes(family.id)) person.fams.push(family.id); });
      family.children.forEach(pid => { const person = p.get(pid); if (person && !person.famc.includes(family.id)) person.famc.push(family.id); });
    }
    for (const person of p.values()) {
      person.name = (person.name.replace(/\//g,' ').replace(/\s+/g,' ').trim() || [person.given, person.surname].filter(Boolean).join(' ') || 'Senza nome');
    }
    return { persons: p, families: f };
  }
  function dateLabel(event) { return event?.date || 'Data non indicata'; }
  function year(event) { const m = (event?.date || '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/); return m ? m[1] : ''; }
  function years(person) { const b = year(person.birth), d = year(person.death); return b || d ? `${b || '?'}–${d || '?'}` : 'Date non disponibili'; }
  function nameById(id) { return persons.get(id)?.name || 'Persona non identificata'; }
  function getParents(p) {
    const ids = new Set();
    p.famc.forEach(fid => { const fam = families.get(fid); if (!fam) return; if (fam.husband) ids.add(fam.husband); if (fam.wife) ids.add(fam.wife); });
    return [...ids].filter(id => persons.has(id));
  }
  function getSpouses(p) {
    const ids = new Set();
    p.fams.forEach(fid => { const fam = families.get(fid); if (!fam) return; [fam.husband, fam.wife].filter(id => id && id !== p.id && persons.has(id)).forEach(id => ids.add(id)); });
    return [...ids];
  }
  function getChildren(p) {
    const ids = new Set(); p.fams.forEach(fid => (families.get(fid)?.children || []).forEach(id => { if (persons.has(id)) ids.add(id); })); return [...ids];
  }
  function renderList() {
    const term = $('personSearch').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const matches = [...persons.values()].filter(p => p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)).sort((a,b) => a.name.localeCompare(b.name,'it')).slice(0, 75);
    const fragment = document.createDocumentFragment();
    for (const person of matches) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'person-result' + (person.id === currentId ? ' active' : '');
      const name = document.createElement('strong'); name.textContent = person.name;
      const small = document.createElement('small'); small.textContent = years(person);
      button.append(name, small); button.addEventListener('click', () => navigate(person.id)); fragment.appendChild(button);
    }
    $('personList').replaceChildren(fragment);
  }
  function node(pid, active = false) {
    const p = persons.get(pid); if (!p) return '';
    return `<button type="button" class="person-node${active ? ' current' : ''}" data-person="${escapeHTML(pid)}"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(years(p))}</small></button>`;
  }
  function draw() {
    const p = persons.get(currentId);
    if (!p) { $('treeContent').innerHTML = '<div class="viewer-placeholder"><h2>Seleziona una persona</h2><p>Apri un GEDCOM o scegli una persona dall’elenco.</p></div>'; $('profile').replaceChildren(); return; }
    const parents = getParents(p), spouses = getSpouses(p), children = getChildren(p);
    $('viewerTitle').textContent = label;
    $('viewerSubtitle').textContent = `${p.name} · ${years(p)}`;
    $('goBack').disabled = history.length === 0;
    $('treeContent').innerHTML = `<div class="generation-label">Generazione precedente · Genitori</div>
      <div class="relationship-row">${parents.length ? parents.map(id => node(id)).join('') : '<div class="no-relatives">Genitori non presenti nel file</div>'}</div>
      <div class="tree-connector"></div><div class="generation-label">Persona selezionata ${spouses.length ? '· e coniugi' : ''}</div>
      <div class="relationship-row">${node(p.id,true)}${spouses.map(id => node(id)).join('')}</div>
      <div class="tree-connector"></div><div class="generation-label">Generazione successiva · Figli</div>
      <div class="relationship-row">${children.length ? children.map(id => node(id)).join('') : '<div class="no-relatives">Nessun figlio registrato</div>'}</div>`;
    $('treeContent').querySelectorAll('button[data-person]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.person)));
    $('profile').innerHTML = `<div class="info-box"><h3>Profilo anagrafico</h3><div class="info-row"><span>Nome</span><strong>${escapeHTML(p.name)}</strong></div><div class="info-row"><span>Sesso</span><strong>${escapeHTML(p.sex === 'M' ? 'Maschile' : p.sex === 'F' ? 'Femminile' : 'Non indicato')}</strong></div><div class="info-row"><span>Nascita</span><strong>${escapeHTML(dateLabel(p.birth))}</strong></div><div class="info-row"><span>Luogo di nascita</span><strong>${escapeHTML(p.birth.place || '—')}</strong></div><div class="info-row"><span>Decesso</span><strong>${escapeHTML(dateLabel(p.death))}</strong></div>${p.occupation ? `<div class="info-row"><span>Professione</span><strong>${escapeHTML(p.occupation)}</strong></div>` : ''}</div>
    <div class="info-box"><h3>Legami familiari</h3><div class="info-row"><span>Genitori registrati</span><strong>${parents.length}</strong></div><div class="info-row"><span>Coniugi registrati</span><strong>${spouses.length}</strong></div><div class="info-row"><span>Figli registrati</span><strong>${children.length}</strong></div><div class="info-row"><span>Famiglie collegate</span><strong>${new Set([...p.famc,...p.fams]).size}</strong></div><div class="info-row"><span>Identificativo GEDCOM</span><strong>${escapeHTML(p.id)}</strong></div></div>`;
    renderList();
  }
  function navigate(pid, addHistory = true) {
    if (!persons.has(pid) || pid === currentId) return;
    if (currentId && addHistory) history.push(currentId);
    currentId = pid; draw();
    if (window.innerWidth <= 860) $('treePanel').scrollIntoView({ behavior:'smooth',block:'start' });
  }
  function load(text, name, isDemo = false) {
    const result = parseGedcom(text);
    if (!result.persons.size) throw new Error('Non sono stati trovati individui GEDCOM. Verifica che il file abbia il formato corretto.');
    persons = result.persons; families = result.families; label = name; history = [];
    // Pick individual participating in multiple generations when possible.
    const ranked = [...persons.values()].sort((a,b) => ((b.famc.length&&b.fams.length)?2:0) - ((a.famc.length&&a.fams.length)?2:0));
    currentId = ranked[0].id;
    $('peopleCount').textContent = `${persons.size.toLocaleString('it-IT')} persone`;
    $('familyCount').textContent = `${families.size.toLocaleString('it-IT')} famiglie`;
    $('demoNotice').hidden = !isDemo;
    $('fileError').hidden = true;
    $('personSearch').value = '';
    draw();
  }
  $('personSearch').addEventListener('input',renderList);
  $('goBack').addEventListener('click', () => { const previous = history.pop(); if (previous) navigate(previous, false); });
  $('resetDemo').addEventListener('click', () => load(demoGedcom, 'Rete dimostrativa', true));
  $('gedFile').addEventListener('change', async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 35 * 1024 * 1024) throw new Error('Il file supera i 35 MB. Per archivi molto grandi consigliamo le pagine web esportate da MacFamilyTree.');
      const text = await file.text(); load(text, file.name, false);
    } catch(err) { $('fileError').hidden = false; $('fileError').textContent = err.message || 'Impossibile aprire il file.'; }
    e.target.value = '';
  });
  load(demoGedcom, 'Rete dimostrativa', true);
})();
