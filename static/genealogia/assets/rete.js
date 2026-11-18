(() => {
 'use strict';
 const slug = new URLSearchParams(location.search).get('comune');
 const town = (window.RADICI_COMUNI || []).find(c => c.slug === slug);
 const $ = id => document.getElementById(id);
 if (!town) { $('networkStatus').textContent = 'Località non trovata'; $('networkPlaceholder').hidden = false; return; }
 const url = town.url || `reti/${encodeURIComponent(town.slug)}/index.html`;
 document.title = `${town.nome} — Radici di Calabria`;
 $('crumbTown').textContent = town.nome; $('networkTitle').textContent = town.nome;
 $('networkDesc').textContent = town.descrizione;
 $('provinceName').textContent = town.provincia.toUpperCase();
 async function init() {
   let isReady = Boolean(town.url || town.ready);
   if (!isReady && location.protocol !== 'file:') {
     try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); isReady = r.ok && (r.headers.get('content-type') || '').includes('text/html'); } catch { /* no exported site yet */ }
   }
   if (!isReady) { $('networkStatus').textContent = 'Archivio in preparazione'; $('networkPlaceholder').hidden = false; return; }
   $('networkStatus').textContent = 'Archivio consultabile'; $('networkStatus').classList.add('ready');
   $('networkFrame').src = url;
   $('networkEmbed').hidden = false;
   $('openDirect').href = url; $('openDirect').hidden = false;
 }
 init();
})();
