(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT');
  const number = (v) => Number(v).toLocaleString('it-IT');
  const params = new URLSearchParams(location.search);
  const slug = params.get('comune') || 'cariati';
  if (!/^[a-z0-9-]+$/.test(slug)) return fail('Codice del comune non valido.');
  const state = {graphView:null, data:null, persons:[], byId:new Map(), families:[], events:new Map(), selected:null, activeTab:'tree', found:[], shown:30, target:null, graph:new Map(), loaded:false};
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
        events:Array.isArray(row[8])?row[8]:[], suffix:String(row[9]||''),
        name:([row[1],row[2],row[9]].filter(Boolean).join(' ')).trim() || 'Senza nome',
        parents:new Set(), children:new Set(), spouses:new Set(), siblings:new Set(), parentFamilies:[], childFamilies:[]
      }));
      state.persons.forEach(p => { p.match=normalize(`${p.name} ${p.surname} ${p.given} ${p.id}`); state.byId.set(p.id,p); });
      state.families = d.famiglie.map(row => ({id:row[0],father:row[1],mother:row[2],children:row[3]||[],marriage:row[4]||'',events:row[5]||[]}));
      state.events = new Map((d.eventi||[]).map(row=>[row[0],{id:row[0],kind:row[1],date:row[2]||'',age:row[3]||'',timestamp:row[4],sourceId:row[5]}]));
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
    $('statEvents').textContent=number(d.totaliPubblici.eventi ?? d.totaliOriginali.eventi);
    $('privacySummary').textContent=d.archivioCompleto?
      'Questa versione include tutti i profili, tutte le famiglie e tutti gli eventi presenti nel GEDCOM aggiornato, anche quando le date non sono note.':
      `Profili con morte registrata o nascita entro il ${d.cutoffNascita}. Alcuni profili e collegamenti non sono pubblicati in questa vista.`;
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
    setupGraphControls();
    window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('persona');if(id&&state.byId.has(id))select(id,false);else{state.selected=null;renderLanding();}});
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {e.preventDefault();$('personSearch').focus();}});
    applyFilters();
  }
  function passesPeriod(p,period) {
    const y=p.birthYear;
    switch(period){case'before1800':return y!==null&&y<1800;case'1800':return y>=1800&&y<=1849;case'1850':return y>=1850&&y<=1899;case'1900':return y>=1900&&y<=1949;case'1950':return y>=1950&&y<=1999;case'2000':return y>=2000;case'unknown':return y===null;default:return true;}
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
  function select(id,push=true,preferredTab='tree'){
    const p=state.byId.get(id);if(!p)return;
    state.selected=id;state.target=null;
    if(push){const url=new URL(location.href);url.searchParams.set('comune',slug);url.searchParams.set('persona',id);history.pushState({id},'',url);}
    $('welcomePanel').hidden=true;$('profilePanel').hidden=false;
    $('profileName').textContent=p.name;
    $('profileType').textContent=p.gender===0?'PERSONA · UOMO':p.gender===1?'PERSONA · DONNA':'SCHEDA INDIVIDUALE';
    $('profileLife').textContent=briefDate(p);
    $('profileID').textContent=`ID ${p.id}`;
    $('pathSearch').value='';$('pathSuggestions').replaceChildren();$('pathResult').innerHTML='';
    setTab(preferredTab);renderResults();
    if(window.matchMedia('(max-width:800px)').matches) $('profilePanel').scrollIntoView({block:'start',behavior:'smooth'});
  }
  function setTab(tab){
    state.activeTab=tab;
    for(const key of ['tree','relations','path','graph']){
      $(`panel${key[0].toUpperCase()+key.slice(1)}`).hidden=(key!==tab);
      const b=$(`tab${key[0].toUpperCase()+key.slice(1)}`);b.classList.toggle('active',key===tab);b.setAttribute('aria-selected',String(key===tab));
    }
    if(!state.selected)return;
    if(tab==='tree')renderTree();
    else if(tab==='relations')renderRelations();
    else if(tab==='graph')renderGraph();
    else if(tab==='path')$('pathResult').innerHTML='<p class="path-prompt">Cerca una seconda persona: verrà ricostruito il percorso minimo attraverso genitori, figli e unioni familiari presenti nell’archivio.</p>';
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
  function relationBlock(title,ids){const people=sortedUnique(ids);return `<div class="family-section"><h4>${safe(title)} <small>${people.length}</small></h4>${people.length?`<div class="family-grid">${people.map(personCard).join('')}</div>`:'<div class="family-empty">Nessuna relazione disponibile nell’archivio.</div>'}</div>`;}
  function renderRelations(){
    const p=state.byId.get(state.selected);
    $('lifeFacts').innerHTML=`<div class="life-fact"><span>NASCITA</span><strong>${safe(labelDate(p.birth))}</strong></div><div class="life-fact"><span>MORTE</span><strong>${safe(labelDate(p.death))}</strong></div><div class="life-fact"><span>IDENTIFICATIVO GEDCOM</span><strong>${safe(p.id)}</strong></div>`;
    const groups=[];
    const events=p.events.map(id=>state.events.get(id)).filter(Boolean).sort((a,b)=>(a.timestamp??0)-(b.timestamp??0));
    if(events.length){
      const names={'_PersonEvent_Birth':'Nascita','_PersonEvent_Death':'Morte','_FamilyEvent_Marriage':'Matrimonio'};
      const lines=events.map(ev=>`<div class="life-fact"><span>${safe(names[ev.kind]||ev.kind||'Evento')}</span><strong>${safe(ev.date||'Data non registrata')}</strong>${ev.age?`<small>Età registrata: ${safe(ev.age)}</small>`:''}</div>`).join('');
      groups.push(`<div class="family-section"><h4>Eventi documentati <small>${events.length}</small></h4><div class="life-facts">${lines}</div></div>`);
    }
    groups.push(relationBlock('Genitori',[...p.parents]));
    groups.push(relationBlock('Fratelli e sorelle',[...p.siblings]));
    if(p.parentFamilies.length){
      let unions=`<div class="family-section"><h4>Unioni e discendenza <small>${p.parentFamilies.length} ${p.parentFamilies.length===1?'nucleo':'nuclei'}</small></h4>`;
      for(const f of p.parentFamilies){
        const spouses=[f.father,f.mother].filter(x=>x&&x!==p.id&&state.byId.has(x));
        const other=spouses.map(id=>state.byId.get(id).name).join(', ') || 'Coniuge non indicato';
        unions+=`<div class="family-group"><div class="family-group-title">${safe(other)} ${f.marriage?`<em>Matrimonio: ${safe(f.marriage)}</em>`:''}</div><div class="family-grid">${(spouses.length?spouses.map(personCard):[]).concat(f.children.map(personCard)).join('')||'<p class="family-empty">Nessun altro profilo collegato</p>'}</div></div>`;
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
    if(!path){out.innerHTML=`<p class="path-prompt">Non è stato trovato un percorso entro 12 passaggi tra <strong>${safe(state.byId.get(state.selected).name)}</strong> e <strong>${safe(p.name)}</strong> nella rete genealogica. Questo non dimostra l’assenza di parentela: i dati di origine possono essere incompleti.</p>`;return;}
    const summary=path.length===1?'La persona coincide con quella selezionata.':`Percorso individuato: ${path.length-1} ${path.length===2?'passaggio':'passaggi'} attraverso le relazioni registrate.`;
    out.innerHTML=`<p class="path-summary">${safe(summary)}</p><div class="path-list">${path.map((step,i)=>`${i?`<div class="path-link">↓ ${safe(step.rel)}</div>`:''}<button type="button" class="path-item" data-person="${safe(step.id)}"><strong>${safe(state.byId.get(step.id).name)}</strong><span>${safe(briefDate(state.byId.get(step.id)))}</span></button>`).join('')}</div>`;
  }
  // Grafo progressivo: la ricerca determina la radice; ogni clic espande o
  // richiude ESCLUSIVAMENTE i legami diretti registrati per quel nodo.
  // Il sesso deriva dal dataset: 0=maschio, 1=femmina.
  const GRAPH_NS='http://www.w3.org/2000/svg';
  const GRAPH_W=1100, GRAPH_H=640;
  const MAX_GRAPH_NODES=700;
  const graph={root:null, nodes:[], edges:[], expanded:new Set(), visible:new Set(),
    positions:new Map(), x:0, y:0, k:1, dragging:null, moved:false,
    suppress:false, activeNode:null, warning:''};
  const makeSvg=(tag,attributes={})=>{
    const el=document.createElementNS(GRAPH_NS,tag);
    for(const [k,v] of Object.entries(attributes))el.setAttribute(k,String(v));
    return el;
  };
  function directRelations(id){
    const p=state.byId.get(id); if(!p)return [];
    return [
      ...sortedUnique([...p.parents]).map(to=>({to,kind:'parent',from:to,target:id})),
      ...sortedUnique([...p.spouses]).map(to=>({to,kind:'union',from:id,target:to})),
      ...sortedUnique([...p.children]).map(to=>({to,kind:'child',from:id,target:to})),
      ...sortedUnique([...p.siblings]).map(to=>({to,kind:'sibling',from:id,target:to}))
    ];
  }
  function graphEdgeKey(edge){
    return edge.kind==='parent'||edge.kind==='child'
      ? `p:${edge.from}|${edge.target}`
      : `${edge.kind==='union'?'u':'s'}:${[edge.from,edge.target].sort().join('|')}`;
  }
  function graphBuild(){
    const shown=new Set([graph.root]),queue=[graph.root],origin=new Map(),edges=new Map();
    for(let i=0;i<queue.length;i++){
      const id=queue[i];
      if(!graph.expanded.has(id))continue;
      for(const r of directRelations(id)){
        if(!shown.has(r.to)){
          shown.add(r.to);queue.push(r.to);origin.set(r.to,{anchor:id,kind:r.kind});
        }
        const e={from:r.from,to:r.target,kind:r.kind==='child'?'parent':r.kind};
        edges.set(graphEdgeKey({from:e.from,target:e.to,kind:e.kind}),e);
      }
    }
    return {shown,origin,edges:[...edges.values()]};
  }
  function graphFindSpace(wanted){
    const taken=(x,y)=>[...graph.positions.values()].some(p=>Math.abs(x-p.x)<164&&Math.abs(y-p.y)<126);
    if(!taken(wanted.x,wanted.y))return wanted;
    for(let ring=1;ring<=25;ring++){
      const count=12*ring;
      for(let i=0;i<count;i++){
        const angle=2*Math.PI*i/count;
        const x=wanted.x+Math.cos(angle)*95*ring;
        const y=wanted.y+Math.sin(angle)*82*ring;
        if(!taken(x,y))return {x,y};
      }
    }
    return {x:wanted.x+3000,y:wanted.y};
  }
  function graphLayoutNew(origin,shown){
    // Le posizioni già visualizzate restano ferme durante le espansioni.
    for(const id of [...graph.positions.keys()])if(!shown.has(id))graph.positions.delete(id);
    if(!graph.positions.has(graph.root))graph.positions.set(graph.root,{x:0,y:0});
    const groups=new Map();
    for(const id of shown){
      if(graph.positions.has(id))continue;
      const source=origin.get(id);
      if(!source)continue;
      const key=source.anchor+':'+source.kind;
      if(!groups.has(key))groups.set(key,{...source,ids:[]});
      groups.get(key).ids.push(id);
    }
    // Dispone ogni gruppo nella direzione naturale della parentela.
    // Se un gruppo entra in collisione con uno precedente, cerca spazio libero.
    let remaining=[...groups.values()];
    for(let pass=0;pass<groups.size+1&&remaining.length;pass++){
      const next=[];
      for(const group of remaining){
        const anchor=graph.positions.get(group.anchor);
        if(!anchor){next.push(group);continue;}
        const ids=group.ids, maxPerRow=group.kind==='parent'?4:6;
        for(let i=0;i<ids.length;i++){
          const ring=Math.floor(i/maxPerRow),col=i%maxPerRow;
          const count=Math.min(maxPerRow,ids.length-ring*maxPerRow);
          const delta=(col-(count-1)/2)*180;
          let x=anchor.x,y=anchor.y;
          if(group.kind==='parent') {x+=delta;y-=180+ring*165;}
          else if(group.kind==='child'){x+=delta;y+=180+ring*165;}
          else if(group.kind==='union'){x+=250+ring*190;y+=delta*.9;}
          else {x-=250+ring*190;y+=delta*.9;}
          graph.positions.set(ids[i],graphFindSpace({x,y}));
        }
      }
      remaining=next;
    }
  }
  function graphRebuild({autoFit=false}={}){
    const result=graphBuild();
    graphLayoutNew(result.origin,result.shown);
    graph.visible=result.shown;graph.edges=result.edges;
    graph.nodes=[...result.shown].map(id=>({id,person:state.byId.get(id)}));
    // Dopo la chiusura di un ramo non devono restare espansioni invisibili.
    for(const id of [...graph.expanded])if(!result.shown.has(id))graph.expanded.delete(id);
    if(!result.shown.has(graph.activeNode))graph.activeNode=graph.root;
    paintGraph();
    if(autoFit){
      if(graph.nodes.length<=16)fitGraph();
      else {
        // Una rete ampia non viene ridotta a puntini illeggibili: restano
        // disponibili zoom e trascinamento per vedere tutti i rami.
        const anchor=graph.positions.get(graph.activeNode)||graph.positions.get(graph.root);
        graph.k=.78;
        graph.x=GRAPH_W/2-anchor.x*graph.k;
        graph.y=GRAPH_H/2-anchor.y*graph.k;
        applyGraphTransform();
      }
    }
    updateGraphStatus();
  }
  function renderGraph(){
    if(!state.selected)return;
    if(graph.root!==state.selected){
      graph.root=state.selected;
      graph.expanded.clear();graph.visible=new Set([state.selected]);
      graph.positions=new Map([[state.selected,{x:0,y:0}]]);
      graph.nodes=[];graph.edges=[];graph.activeNode=state.selected;graph.warning='';
      graph.x=0;graph.y=0;graph.k=1;
      graphRebuild();centerGraph();
    }else{paintGraph();updateGraphStatus();}
  }
  function resetGraph(){
    if(!state.selected)return;
    graph.root=null;renderGraph();
  }
  function toggleGraphNode(id){
    if(!graph.visible.has(id))return;
    graph.warning='';graph.activeNode=id;
    if(graph.expanded.has(id)){
      graph.expanded.delete(id);
      graphRebuild({autoFit:true});
      return;
    }
    graph.expanded.add(id);
    const candidate=graphBuild();
    if(candidate.shown.size>MAX_GRAPH_NODES){
      graph.expanded.delete(id);
      graph.warning=`Questo clic porterebbe a ${number(candidate.shown.size)} persone. Per conservare la fluidità del browser il limite della vista è ${number(MAX_GRAPH_NODES)} nodi. Torna al profilo di partenza oppure richiudi alcuni rami.`;
      updateGraphStatus();return;
    }
    graphRebuild({autoFit:true});
  }
  function updateGraphStatus(){
    if(!graph.root)return;
    const total=graph.nodes.length;
    $('graphSummary').textContent=`${number(total)} ${total===1?'persona':'persone'} · ${number(graph.edges.length)} collegamenti · ${number(graph.expanded.size)} ${graph.expanded.size===1?'nodo espanso':'nodi espansi'}`;
    const p=state.byId.get(graph.activeNode)||state.byId.get(graph.root);
    if(p){
      const n=directRelations(p.id).length, open=graph.expanded.has(p.id);
      $('graphNodeDetails').textContent=`${p.name} (${briefDate(p)}) · ${number(n)} relazioni dirette · ${open?'Clicca di nuovo sul nodo per richiuderlo':'Clicca sul nodo per espanderlo'}`;
      $('graphOpenProfile').disabled=p.id===state.selected;
      $('graphOpenProfile').textContent=p.id===state.selected?'Profilo di partenza':'Apri scheda persona ↗';
    }
    $('graphLimitNote').hidden=!graph.warning;
    if(graph.warning)$('graphLimitNote').textContent=graph.warning;
  }
  function graphWordLines(name){
    const words=String(name||'Senza nome').split(/\s+/).filter(Boolean);
    const lines=[''];
    for(const w of words){
      const last=lines.length-1;
      if((lines[last]+' '+w).trim().length>22&&lines[last]&&lines.length<2)lines.push(w);
      else lines[last]=(lines[last]+' '+w).trim();
    }
    return lines.map(l=>l.length>25?l.slice(0,24)+'…':l);
  }
  function paintGraph(){
    const scene=$('graphScene');scene.replaceChildren();
    const edges=makeSvg('g',{'class':'graph-edges'});
    for(const edge of graph.edges){
      const a=graph.positions.get(edge.from),b=graph.positions.get(edge.to);
      if(!a||!b)continue;
      const line=makeSvg('path',{'class':`graph-edge graph-edge-${edge.kind}`,
        d:`M ${a.x} ${a.y} L ${b.x} ${b.y}`});
      const t=makeSvg('title');t.textContent=edge.kind==='parent'?'Relazione genitore–figlio':edge.kind==='union'?'Unione familiare':'Fratelli o sorelle';
      line.append(t);edges.appendChild(line);
    }
    scene.appendChild(edges);
    const nodes=makeSvg('g',{'class':'graph-nodes'});
    for(const item of graph.nodes){
      const p=item.person, point=graph.positions.get(p.id);
      if(!point)continue;
      const opened=graph.expanded.has(p.id), root=p.id===graph.root;
      const sex=p.gender===0?'male':p.gender===1?'female':'unknown';
      const g=makeSvg('g',{'class':`graph-node graph-${sex}${root?' is-focus':''}${opened?' is-open':''}${p.id===graph.activeNode?' is-active':''}`,
        transform:`translate(${point.x},${point.y})`,'data-graph-person':p.id,
        'role':'button','tabindex':'0',
        'aria-label':`${p.name}, ${sex==='male'?'maschio':sex==='female'?'femmina':'sesso non indicato'}, ${briefDate(p)}. ${opened?'Richiudi':'Espandi'} relazioni dirette`});
      const title=makeSvg('title');title.textContent=`${p.name} (${briefDate(p)}) — ${opened?'Richiudi':'Espandi'} relazioni`;
      let figure;
      if(sex==='male')figure=makeSvg('rect',{x:-34,y:-34,width:68,height:68,rx:3,'class':'graph-sex-shape'});
      else if(sex==='female')figure=makeSvg('circle',{cx:0,cy:0,r:34,'class':'graph-sex-shape'});
      else figure=makeSvg('path',{d:'M0 -38 L38 0 L0 38 L-38 0Z','class':'graph-sex-shape'});
      const initials=(p.given||p.surname||'?').trim().charAt(0).toLocaleUpperCase('it-IT')||'?';
      const letter=makeSvg('text',{x:0,y:7,'class':'graph-monogram','text-anchor':'middle'});letter.textContent=initials;
      const mark=makeSvg('text',{x:43,y:-28,'class':'graph-expand-mark','text-anchor':'middle'});mark.textContent=opened?'−':'+';
      g.append(title,figure,letter,mark);
      const lines=graphWordLines(p.name);
      for(let i=0;i<lines.length;i++){
        const label=makeSvg('text',{x:0,y:58+i*16,'class':'graph-node-name','text-anchor':'middle'});
        label.textContent=lines[i];g.appendChild(label);
      }
      const years=makeSvg('text',{x:0,y:58+lines.length*16,'class':'graph-node-years','text-anchor':'middle'});
      years.textContent=briefDate(p);g.appendChild(years);
      nodes.appendChild(g);
    }
    scene.appendChild(nodes);
    applyGraphTransform();
  }
  function setupGraphControls(){
    $('graphReset').addEventListener('click',resetGraph);
    $('graphZoomIn').addEventListener('click',()=>zoomGraph(1.28));
    $('graphZoomOut').addEventListener('click',()=>zoomGraph(1/1.28));
    $('graphFit').addEventListener('click',fitGraph);
    $('graphCenter').addEventListener('click',centerGraph);
    $('graphSave').addEventListener('click',exportGraph);
    $('graphOpenProfile').addEventListener('click',()=>{
      if(graph.activeNode&&graph.activeNode!==state.selected)select(graph.activeNode,true,'tree');
    });
    const svg=$('graphSvg');
    svg.addEventListener('wheel',e=>{
      if(state.activeTab!=='graph')return;
      e.preventDefault();
      const b=svg.getBoundingClientRect();
      const sx=(e.clientX-b.left)*GRAPH_W/b.width,sy=(e.clientY-b.top)*GRAPH_H/b.height;
      zoomGraph(e.deltaY<0?1.1:1/1.1,sx,sy);
    },{passive:false});
    svg.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      const el=e.target.closest('[data-graph-person]');
      graph.dragging={pointer:e.pointerId,id:el?el.getAttribute('data-graph-person'):null,
        startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY};
      graph.moved=false;
      svg.setPointerCapture(e.pointerId);
      $('graphViewport').classList.add('is-panning');
    });
    svg.addEventListener('pointermove',e=>{
      const drag=graph.dragging;if(!drag||drag.pointer!==e.pointerId)return;
      const rect=svg.getBoundingClientRect();
      const dx=(e.clientX-drag.lastX)*GRAPH_W/rect.width;
      const dy=(e.clientY-drag.lastY)*GRAPH_H/rect.height;
      drag.lastX=e.clientX;drag.lastY=e.clientY;
      if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)graph.moved=true;
      if(!graph.moved)return;
      if(drag.id){
        const pos=graph.positions.get(drag.id);
        if(pos){pos.x+=dx/graph.k;pos.y+=dy/graph.k;paintGraph();}
      }else{graph.x+=dx;graph.y+=dy;applyGraphTransform();}
    });
    const finish=e=>{
      if(!graph.dragging||graph.dragging.pointer!==e.pointerId)return;
      const clicked=!graph.moved?graph.dragging.id:null;
      graph.dragging=null;$('graphViewport').classList.remove('is-panning');
      if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
      if(graph.moved||clicked){graph.suppress=true;setTimeout(()=>{graph.suppress=false;},0);}
      if(clicked)toggleGraphNode(clicked);
    };
    svg.addEventListener('pointerup',finish);
    svg.addEventListener('pointercancel',e=>{
      if(graph.dragging?.pointer===e.pointerId){graph.dragging=null;$('graphViewport').classList.remove('is-panning');}
    });
    svg.addEventListener('click',e=>{
      if(graph.suppress||graph.moved)return;
      const el=e.target.closest('[data-graph-person]');
      if(el)toggleGraphNode(el.getAttribute('data-graph-person'));
    });
    svg.addEventListener('keydown',e=>{
      if(e.key!=='Enter'&&e.key!==' ')return;
      const el=e.target.closest('[data-graph-person]');
      if(!el)return;
      e.preventDefault();toggleGraphNode(el.getAttribute('data-graph-person'));
    });
  }
  function applyGraphTransform(){
    $('graphScene').setAttribute('transform',`translate(${graph.x} ${graph.y}) scale(${graph.k})`);
  }
  function centerGraph(){
    const root=graph.positions.get(graph.root);if(!root)return;
    graph.k=1.12;graph.x=GRAPH_W/2-root.x*graph.k;graph.y=GRAPH_H/2-root.y*graph.k;
    applyGraphTransform();
  }
  function fitGraph(){
    if(!graph.nodes.length)return;
    const positions=[...graph.positions.values()];
    const x1=Math.min(...positions.map(p=>p.x))-115,x2=Math.max(...positions.map(p=>p.x))+115;
    const y1=Math.min(...positions.map(p=>p.y))-72,y2=Math.max(...positions.map(p=>p.y))+112;
    graph.k=Math.min(1.4,Math.max(.1,Math.min((GRAPH_W-70)/(x2-x1),(GRAPH_H-70)/(y2-y1))));
    graph.x=GRAPH_W/2-(x1+x2)/2*graph.k;
    graph.y=GRAPH_H/2-(y1+y2)/2*graph.k;
    applyGraphTransform();
  }
  function zoomGraph(factor,px=GRAPH_W/2,py=GRAPH_H/2){
    if(!graph.nodes.length)return;
    const newK=Math.max(.1,Math.min(3,graph.k*factor));
    const f=newK/graph.k;
    graph.x=px-(px-graph.x)*f;graph.y=py-(py-graph.y)*f;
    graph.k=newK;applyGraphTransform();
  }
  function exportGraph(){
    if(!graph.nodes.length)return;
    // L'SVG esportato contiene l'intero grafo attualmente espanso, non solo
    // la porzione visibile nel riquadro dopo uno zoom.
    const positions=[...graph.positions.values()];
    const minX=Math.min(...positions.map(p=>p.x))-140,maxX=Math.max(...positions.map(p=>p.x))+140;
    const minY=Math.min(...positions.map(p=>p.y))-100,maxY=Math.max(...positions.map(p=>p.y))+135;
    const clone=makeSvg('svg',{xmlns:GRAPH_NS,viewBox:`${minX} ${minY} ${maxX-minX} ${maxY-minY}`,
      width:Math.ceil(maxX-minX),height:Math.ceil(maxY-minY)});
    const style=makeSvg('style');
    style.textContent=`.graph-edge{fill:none;stroke:#8ba79a;stroke-width:2}.graph-edge-union{stroke:#b2875b;stroke-dasharray:7 6}.graph-edge-sibling{stroke:#97a6ae;stroke-dasharray:2 7}.graph-sex-shape{fill:#fffefa;stroke:#668d7d;stroke-width:2.4}.graph-female .graph-sex-shape{fill:#fbf4e9;stroke:#b6976d}.graph-node.is-focus .graph-sex-shape{stroke:#214d40;stroke-width:3;fill:#dfece3}.graph-node.is-open .graph-sex-shape{stroke-width:3.3}.graph-monogram{font-family:Arial,sans-serif;font-size:22px;font-weight:bold;fill:#234a3e}.graph-expand-mark{font-family:Arial,sans-serif;font-size:24px;font-weight:bold;fill:#477e65}.graph-node-name{font-family:Arial,sans-serif;font-size:13px;font-weight:700;fill:#25463c}.graph-node-years{font-family:Arial,sans-serif;font-size:11px;fill:#64786e}`;
    const background=makeSvg('rect',{x:minX,y:minY,width:maxX-minX,height:maxY-minY,fill:'#f6f8f4'});
    const scene=$('graphScene').cloneNode(true);scene.removeAttribute('transform');
    clone.append(style,background,scene);
    const blob=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
    a.download=`grafo-a-click-${slug}-${graph.root.replace(/[^a-z0-9_-]/gi,'')}.svg`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  async function copyLink(){
    try{await navigator.clipboard.writeText(location.href);$('copyProfile').textContent='Link copiato ✓';setTimeout(()=>$('copyProfile').textContent='Copia link',1800);}
    catch{$('copyProfile').textContent='Copia dalla barra indirizzi';setTimeout(()=>$('copyProfile').textContent='Copia link',2600);}
  }
  load();
})();
