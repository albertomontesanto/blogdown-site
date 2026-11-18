(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT');
  const number = (v) => Number(v).toLocaleString('it-IT');
  const params = new URLSearchParams(location.search);
  const slug = params.get('comune') || 'cariati';
  if (!/^[a-z0-9-]+$/.test(slug)) return fail('Codice del comune non valido.');
  const state = {data:null, persons:[], byId:new Map(), families:[], selected:null, activeTab:'tree', found:[], shown:30, target:null, graph:new Map(), loaded:false};
  const add = (map,key,value) => {if (!map.has(key)) map.set(key,[]); map.get(key).push(value);};
  const sortedUnique = (arr) => [...new Set(arr)].filter(id => state.byId.has(id)).sort((a,b) => state.byId.get(a).name.localeCompare(state.byId.get(b).name,'it'));
  const briefDate = (p) => (p.birthYear || '—') + ' — ' + (p.deathYear || '—');
  const labelDate = (date) => date || 'Non registrata';
  function fail(message) {
    const box = $('errorView'); $('loadingView').hidden = true;
    box.hidden = false;
    box.innerHTML = `<h2>Archivio non disponibile</h2><p>${safe(message)}</p><p><a href="index.html">Torna al catalogo dei comuni</a></p>`;
  }
  async function load() {
    try {
      const response = await fetch(`data/${slug}/rete.json`, {cache:'no-store'});
      if (!response.ok) throw new Error(`File dati non trovato (${response.status}).`);
      const d = await response.json();
      if (d.schema !== 'radici-calabria-v1' || !Array.isArray(d.persone) || !Array.isArray(d.famiglie)) throw new Error('Formato dati non riconosciuto.');
      state.data = d;
      state.persons = d.persone.map(row => ({
        id:String(row[0]), given:String(row[1]||''), surname:String(row[2]||''), gender:row[3],
        birth:String(row[4]||''), death:String(row[5]||''), birthYear:row[6], deathYear:row[7],
        name:(String(row[1]||'')+' '+String(row[2]||'')).trim() || 'Senza nome',
        parents:new Set(), children:new Set(), spouses:new Set(), siblings:new Set(), parentFamilies:[], childFamilies:[]
      }));
      state.persons.forEach(p => { p.match=normalize(`${p.name} ${p.surname} ${p.given} ${p.id}`); state.byId.set(p.id,p); });
      state.families = d.famiglie.map(row => ({id:row[0],father:row[1],mother:row[2],children:row[3]||[],marriage:row[4]||''}));
      for (const f of state.families) {
        const parents=[f.father,f.mother].filter(x=>state.byId.has(x));
        parents.forEach(id => state.byId.get(id).parentFamilies.push(f));
        f.children.forEach(cid => {
          const child=state.byId.get(cid); if (!child) return;
          child.childFamilies.push(f);
          parents.forEach(pid => {child.parents.add(pid); state.byId.get(pid).children.add(cid);});
        });
        if (parents.length===2) {state.byId.get(parents[0]).spouses.add(parents[1]);state.byId.get(parents[1]).spouses.add(parents[0]);}
        for(let i=0;i<f.children.length;i++)for(let j=i+1;j<f.children.length;j++){
          const a=state.byId.get(f.children[i]), b=state.byId.get(f.children[j]);
          if(a&&b){a.siblings.add(b.id);b.siblings.add(a.id);}
        }
      }
      state.loaded = true;
      renderSetup();
      $('loadingView').hidden = true;
      $('appMain').hidden = false;
      const initial=params.get('persona');
      if(initial && state.byId.has(initial)) select(initial,false);
      else renderLanding();
    } catch(e) {
      const hint = location.protocol === 'file:' ? ' Apri il progetto tramite un server web locale o Netlify, non come file locale.' : '';
      fail(`${e.message || e}.${hint}`);
    }
  }
  function renderSetup() {
    const d=state.data;
    document.title = `${d.comune} — Esplora la rete | Radici di Calabria`;
    $('crumbTown').textContent=d.comune;
    $('crumbProvince').textContent='Provincia di '+(d.provincia||'Cosenza');
    $('statPeriod').textContent=Array.isArray(d.periodo)&&d.periodo.length===2?`${d.periodo[0]}–${d.periodo[1]}`:'—';
    $('periodLabel').textContent='Intervallo storico dei dati di '+d.comune;
    $('townTitle').replaceChildren(document.createTextNode(d.comune),Object.assign(document.createElement('span'),{className:'title-mark',textContent:'.'}));
    $('statPeople').textContent=number(d.totaliPubblici.persone);
    $('statFamilies').textContent=number(d.totaliPubblici.famiglie);
    $('statOriginal').textContent=number(d.totaliOriginali.persone);
    $('privacySummary').textContent=`Profili con morte registrata o nascita entro il ${d.cutoffNascita}. I profili senza una prova storica sufficiente non vengono pubblicati in questa vista. L'assenza di una persona non significa necessariamente che non esista nell'archivio.`;
    const legacy=`rete.html?comune=${encodeURIComponent(slug)}`;
    $('legacyLink').href=legacy; $('originalBottom').href=legacy;
    const surnames=new Map();
    state.persons.forEach(p=>{if (p.surname && !/^(nn|n\.n\.|sconosciut[oa])$/i.test(p.surname)) surnames.set(p.surname,(surnames.get(p.surname)||0)+1);});
    [...surnames].sort((a,b)=>b[1]-a[1]).slice(0,7).forEach(([name])=>{
      const b=document.createElement('button');b.type='button';b.className='surname-chip';b.textContent=name;
      b.addEventListener('click',()=>{$('personSearch').value=name;applyFilters();$('personSearch').focus();});$('surnameChips').appendChild(b);
    });
    $('personSearch').addEventListener('input',applyFilters);
    $('filterPeriod').addEventListener('change',applyFilters);
    $('filterGender').addEventListener('change',applyFilters);
    $('resetFilters').addEventListener('click',()=>{$('personSearch').value='';$('filterPeriod').value='all';$('filterGender').value='all';applyFilters();});
    $('moreResults').addEventListener('click',()=>{state.shown+=30;renderResults();});
    $('peopleResults').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b)select(b.dataset.person);});
    $('closeProfile').addEventListener('click',()=>{state.selected=null;state.target=null;const url=new URL(location.href);url.searchParams.delete('persona');history.pushState({},'',url);renderLanding();});
    $('copyProfile').addEventListener('click',copyLink);
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    $('treeCanvas').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b)select(b.dataset.person);});
    $('familyRelations').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b)select(b.dataset.person);});
    $('pathSuggestions').addEventListener('click',e=>{const b=e.target.closest('[data-target]');if(b)showPath(b.dataset.target);});
    $('pathResult').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(b)select(b.dataset.person);});
    $('pathSearch').addEventListener('input',renderPathSuggestions);
    $('resetTree').addEventListener('click',centerTree);
    window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('persona');if(id&&state.byId.has(id))select(id,false);else{state.selected=null;renderLanding();}});
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {e.preventDefault();$('personSearch').focus();}});
    applyFilters();
  }
  function passesPeriod(p,period) {
    const y=p.birthYear;
    switch(period){case'before1800':return y!==null&&y<1800;case'1800':return y>=1800&&y<=1849;case'1850':return y>=1850&&y<=1899;case'1900':return y>=1900&&y<=1906;case'unknown':return y===null;default:return true;}
  }
  function matchesTerms(p,q){
    if(!q)return true;
    const tokens=q.split(/\s+/).filter(Boolean);
    return tokens.every(word=>p.match.includes(word));
  }
  function applyFilters() {
    const q=normalize($('personSearch').value.trim());
    const period=$('filterPeriod').value; const gender=$('filterGender').value;
    state.found=state.persons.filter(p=>matchesTerms(p,q)&&passesPeriod(p,period)&&(gender==='all'||String(p.gender)===gender));
    state.shown=30;renderResults();
  }
  function renderResults() {
    const list=$('peopleResults');list.replaceChildren();
    $('resultsCount').textContent=`${number(state.found.length)} ${state.found.length===1?'persona':'persone'}`;
    if(!state.found.length){list.innerHTML='<div class="no-results">Nessuna persona trovata con questi filtri. Prova a cercare solo il cognome o un intervallo di nascita diverso.</div>';}
    else {
      const frag=document.createDocumentFragment();
      for(const p of state.found.slice(0,state.shown)){
        const b=document.createElement('button');b.type='button';b.className='person-item'+(state.selected===p.id?' selected':'');b.dataset.person=p.id;
        b.innerHTML=`<span class="person-item-main"><strong>${safe(p.name)}</strong><small>${safe(briefDate(p))} · ${safe(p.id)}</small></span><span class="next" aria-hidden="true">→</span>`;
        frag.appendChild(b);
      }
      list.appendChild(frag);
    }
    $('moreResults').hidden=state.shown>=state.found.length;
    $('moreResults').textContent=`Mostra altre persone (${number(Math.max(0,state.found.length-state.shown))} restanti) ↓`;
  }
  function renderLanding(){$('welcomePanel').hidden=false;$('profilePanel').hidden=true;renderResults();}
  function select(id,push=true){
    const p=state.byId.get(id);if(!p)return;
    state.selected=id;state.target=null;
    if(push){const url=new URL(location.href);url.searchParams.set('comune',slug);url.searchParams.set('persona',id);history.pushState({id},'',url);}
    $('welcomePanel').hidden=true;$('profilePanel').hidden=false;
    $('profileName').textContent=p.name;
    $('profileType').textContent=p.gender===0?'PERSONA · UOMO':p.gender===1?'PERSONA · DONNA':'SCHEDA INDIVIDUALE';
    $('profileLife').textContent=briefDate(p);
    $('profileID').textContent=`ID ${p.id}`;
    $('pathSearch').value='';$('pathSuggestions').replaceChildren();$('pathResult').innerHTML='';
    setTab('tree');renderResults();
    if(window.matchMedia('(max-width:800px)').matches) $('profilePanel').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function setTab(tab){
    state.activeTab=tab;
    for(const key of ['tree','relations','path']){
      $(`panel${key[0].toUpperCase()+key.slice(1)}`).hidden=(key!==tab);
      const b=$(`tab${key[0].toUpperCase()+key.slice(1)}`);b.classList.toggle('active',key===tab);b.setAttribute('aria-selected',String(key===tab));
    }
    if(!state.selected)return;
    if(tab==='tree')renderTree();
    else if(tab==='relations')renderRelations();
    else if(tab==='path')$('pathResult').innerHTML='<p class="path-prompt">Cerca una seconda persona: verrà ricostruito il percorso minimo attraverso genitori, figli e unioni familiari presenti nei dati pubblici.</p>';
  }
  function renderTree() {
    const focus=state.byId.get(state.selected);if(!focus)return;
    const at=(ids,max=14)=>sortedUnique(ids).slice(0,max);
    const parents=at([...focus.parents],6);
    const grandparents=at(parents.flatMap(id=>[...state.byId.get(id).parents]),12);
    const peers=[focus.id,...at([...focus.spouses],8)];
    const children=at([...focus.children],14);
    const grandchildren=at(children.flatMap(id=>[...state.byId.get(id).children]),16);
    const levels=[grandparents,parents,peers,children,grandchildren];
    const counts=[sortedUnique(parents.flatMap(id=>[...state.byId.get(id).parents])).length,focus.parents.size,focus.spouses.size+1,focus.children.size,sortedUnique([...focus.children].flatMap(id=>[...state.byId.get(id).children])).length];
    const labels=['NONNI','GENITORI','PERSONA E CONIUGI','FIGLI','NIPOTI'];
    const max=Math.max(...levels.map(x=>x.length),3);
    const width=Math.max(830,max*188+70),height=5*125+40;
    const canvas=$('treeCanvas'); canvas.replaceChildren(); canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','tree-edges');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
    const positions=new Map();
    levels.forEach((ids,level)=>{
      const total=ids.length*164+Math.max(0,ids.length-1)*24;
      const start=(width-total)/2;
      const y=24+level*125;
      const label=document.createElement('div');label.className='tree-gen-label';label.textContent=labels[level]+(counts[level]>ids.length?` · ${counts[level]-ids.length} altri non visualizzati`:'');label.style.top=`${y-15}px`;canvas.appendChild(label);
      if(!ids.length){const p=document.createElement('span');p.className='tree-placeholder';p.textContent='Nessun legame disponibile';p.style.top=`${y+30}px`;p.style.left=`${width/2-80}px`;canvas.appendChild(p);}
      ids.forEach((id,index)=>{
        const p=state.byId.get(id);const x=start+index*188;
        positions.set(id,{x:x+82,y:y,level});
        const b=document.createElement('button');b.type='button';b.className='tree-person'+(id===focus.id?' focus':'');b.dataset.person=id;b.title=p.name;
        b.style.left=`${x}px`;b.style.top=`${y}px`;
        b.innerHTML=`<span class="tree-name">${safe(p.name)}</span><span class="tree-years">${safe(briefDate(p))}</span>`;
        canvas.appendChild(b);
      });
    });
    const edges=[];
    // Un ramo per nucleo familiare: un connettore orizzontale comune evita
    // decine di linee diagonali incrociate nelle famiglie numerose.
    const bundleIndex=[0,0,0,0];
    for(let generation=0;generation<4;generation++){
      for(const family of state.families){
        const parentIds=[family.father,family.mother].filter(id=>positions.has(id)&&positions.get(id).level===generation);
        const childIds=family.children.filter(id=>positions.has(id)&&positions.get(id).level===generation+1);
        if(!parentIds.length||!childIds.length)continue;
        const parentX=parentIds.map(id=>positions.get(id).x);
        const childX=childIds.map(id=>positions.get(id).x);
        const top=positions.get(parentIds[0]).y+77;
        const bottom=positions.get(childIds[0]).y;
        const junctionY=Math.min(bottom-10,top+20+(bundleIndex[generation]++%3)*5);
        const lo=Math.min(...parentX,...childX),hi=Math.max(...parentX,...childX);
        edges.push(`<path d="M ${lo} ${junctionY} L ${hi} ${junctionY}"/>`);
        for(const id of parentIds){const pt=positions.get(id);edges.push(`<path d="M ${pt.x} ${pt.y+77} L ${pt.x} ${junctionY}"/>`);}
        for(const id of childIds){const pt=positions.get(id);edges.push(`<path d="M ${pt.x} ${junctionY} L ${pt.x} ${pt.y}"/>`);}
      }
    }
    const focalPos=positions.get(focus.id);
    for(const spouse of focus.spouses){const other=positions.get(spouse);if(other&&focalPos){let x1=focalPos.x,x2=other.x;let y=other.y+39;edges.push(`<path class="spouse" d="M ${x1} ${y} L ${x2} ${y}"/>`);}}
    svg.innerHTML=edges.join('');
    canvas.insertBefore(svg,canvas.firstChild);
    centerTree();
  }
  function centerTree(){const scroll=$('treeScroll'); scroll.scrollLeft=Math.max(0,(scroll.scrollWidth-scroll.clientWidth)/2);}
  function personCard(id) {
    const p=state.byId.get(id);if(!p)return '';
    return `<button class="family-person" type="button" data-person="${safe(p.id)}"><span><strong>${safe(p.name)}</strong><small>${safe(briefDate(p))}</small></span><span aria-hidden="true">→</span></button>`;
  }
  function relationBlock(title,ids){const people=sortedUnique(ids);return `<div class="family-section"><h4>${safe(title)} <small>${people.length}</small></h4>${people.length?`<div class="family-grid">${people.map(personCard).join('')}</div>`:'<div class="family-empty">Nessuna relazione pubblica disponibile nell’archivio.</div>'}</div>`;}
  function renderRelations(){
    const p=state.byId.get(state.selected);
    $('lifeFacts').innerHTML=`<div class="life-fact"><span>NASCITA</span><strong>${safe(labelDate(p.birth))}</strong></div><div class="life-fact"><span>MORTE</span><strong>${safe(labelDate(p.death))}</strong></div><div class="life-fact"><span>IDENTIFICATIVO GEDCOM</span><strong>${safe(p.id)}</strong></div>`;
    const groups=[];
    groups.push(relationBlock('Genitori',[...p.parents]));
    groups.push(relationBlock('Fratelli e sorelle',[...p.siblings]));
    if(p.parentFamilies.length){
      let unions=`<div class="family-section"><h4>Unioni e discendenza <small>${p.parentFamilies.length} ${p.parentFamilies.length===1?'nucleo':'nuclei'}</small></h4>`;
      for(const f of p.parentFamilies){
        const spouses=[f.father,f.mother].filter(x=>x&&x!==p.id&&state.byId.has(x));
        const other=spouses.map(id=>state.byId.get(id).name).join(', ') || 'Coniuge non pubblicato';
        unions+=`<div class="family-group"><div class="family-group-title">${safe(other)} ${f.marriage?`<em>Matrimonio: ${safe(f.marriage)}</em>`:''}</div><div class="family-grid">${(spouses.length?spouses.map(personCard):[]).concat(f.children.map(personCard)).join('')||'<p class="family-empty">Nessun profilo aggiuntivo consultabile</p>'}</div></div>`;
      }
      groups.push(unions+'</div>');
    } else {groups.push(relationBlock('Coniugi',[...p.spouses]));groups.push(relationBlock('Figli',[...p.children]));}
    $('familyRelations').innerHTML=groups.join('');
  }
  function renderPathSuggestions(){
    if(!state.selected)return;
    const q=normalize($('pathSearch').value.trim());
    const box=$('pathSuggestions');box.replaceChildren();
    if(q.length<2)return;
    const matches=state.persons.filter(p=>p.id!==state.selected&&matchesTerms(p,q)).slice(0,12);
    if(!matches.length){box.innerHTML='<p class="path-prompt">Nessuna persona trovata.</p>';return;}
    for(const p of matches){const b=document.createElement('button');b.type='button';b.className='path-suggestion';b.dataset.target=p.id;b.innerHTML=`<strong>${safe(p.name)}</strong><small>${safe(briefDate(p))} · ${safe(p.id)}</small>`;box.appendChild(b);}
  }
  function neighbors(id){
    const p=state.byId.get(id);if(!p)return [];
    return [...[...p.parents].map(to=>({to,rel:'genitore'})),...[...p.children].map(to=>({to,rel:'figlio/a'})),...[...p.spouses].map(to=>({to,rel:'coniuge'}))];
  }
  function shortestPath(start,end,maxDepth=12){
    if(start===end)return [{id:start,rel:null}];
    const queue=[start],visited=new Map([[start,{from:null,rel:null,depth:0}]]);
    for(let i=0;i<queue.length;i++){
      const id=queue[i],cur=visited.get(id);
      if(cur.depth>=maxDepth)continue;
      for(const edge of neighbors(id)){
        if(visited.has(edge.to))continue;
        visited.set(edge.to,{from:id,rel:edge.rel,depth:cur.depth+1});
        if(edge.to===end){const path=[];let now=end;while(now){const step=visited.get(now);path.push({id:now,rel:step.rel});now=step.from;}return path.reverse();}
        queue.push(edge.to);
      }
    }
    return null;
  }
  function showPath(target){
    const p=state.byId.get(target);if(!p||!state.selected)return;
    state.target=target;
    $('pathSearch').value=p.name;
    $('pathSuggestions').replaceChildren();
    const path=shortestPath(state.selected,target);
    const out=$('pathResult');
    if(!path){out.innerHTML=`<p class="path-prompt">Non è stato trovato un percorso entro 12 passaggi tra <strong>${safe(state.byId.get(state.selected).name)}</strong> e <strong>${safe(p.name)}</strong> nella rete pubblica. Questo non dimostra l'assenza di parentela: alcuni profili e collegamenti non sono disponibili in questa versione.</p>`;return;}
    const summary=path.length===1?'La persona coincide con quella selezionata.':`Percorso individuato: ${path.length-1} ${path.length===2?'passaggio':'passaggi'} attraverso le relazioni registrate.`;
    out.innerHTML=`<p class="path-summary">${safe(summary)}</p><div class="path-list">${path.map((step,i)=>`${i?`<div class="path-link">↓ ${safe(step.rel)}</div>`:''}<button type="button" class="path-item" data-person="${safe(step.id)}"><strong>${safe(state.byId.get(step.id).name)}</strong><span>${safe(briefDate(state.byId.get(step.id)))}</span></button>`).join('')}</div>`;
  }
  async function copyLink(){
    try{await navigator.clipboard.writeText(location.href);$('copyProfile').textContent='Link copiato ✓';setTimeout(()=>$('copyProfile').textContent='Copia link',1800);}
    catch{$('copyProfile').textContent='Copia dalla barra indirizzi';setTimeout(()=>$('copyProfile').textContent='Copia link',2600);}
  }
  load();
})();
