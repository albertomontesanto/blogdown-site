import {parseAB1} from './abif.js';
import {SITES,BASE_COLORS,parseReference,genotypeTrace,sampleId,csvEscape} from './core.js';

const $=id=>document.getElementById(id);
let selectedFiles=[],results=[],reference=null,selectedResult=0;
const showStatus=(msg,type='info')=>{const el=$('reference-status');el.textContent=msg;el.className=`notice ${type}`;};
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const genotypeText=c=>c?.genotype||'—';
function renderReference(){
  if(!reference){$('reference-desc').textContent='Nessun riferimento caricato';return;}
  $('reference-desc').textContent=`chr13:${reference.start.toLocaleString('it-IT')}–${reference.end.toLocaleString('it-IT')} · ${reference.source}`;
  $('ref-pill').textContent=reference.verified?'Riferimento genomico verificato':'FASTA manuale · verifica richiesta';
  $('ref-pill').className='pill '+(reference.verified?'green':'amber');
  $('manual-fasta').value=`>chr13:${reference.start}-${reference.end} GRCh38\n`+reference.sequence.match(/.{1,75}/g).join('\n');
  $('fasta-start').value=reference.start;
}
$('ncbi-btn').addEventListener('click',async()=>{
  const button=$('ncbi-btn');button.disabled=true;button.textContent='Recupero da NCBI…';showStatus('Connessione al riferimento GRCh38 in corso…','info');
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),28000);
    let res;
    try{res=await fetch('/.netlify/functions/klotho-reference',{cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timer);}
    const type=res.headers.get('content-type')||'';
    if(!type.includes('application/json'))throw Error(`La funzione Netlify non risponde con JSON (HTTP ${res.status}). Controlla il deploy delle Functions.`);
    const json=await res.json();
    if(!res.ok||!json.ok)throw Error(json.error||`HTTP ${res.status}`);
    const r=parseReference(json.sequence,json.start,json.source||'NCBI',true);
    if(json.end!==r.end)throw Error('Lunghezza del FASTA incoerente con il servizio di riferimento.');
    reference=r;renderReference();showStatus(`Riferimento verificato: ${r.source}. I tre alleli di riferimento sono T, G, G.`, 'ok');
    if(results.length)clearResults();
  }catch(err){showStatus(`Recupero non riuscito: ${err.message} Puoi incollare un FASTA GRCh38 verificato nel pannello manuale.`, 'error');}
  finally{button.disabled=false;button.textContent='↓ Recupera FASTA da NCBI';}
});
$('manual-load').addEventListener('click',()=>{
  try{reference=parseReference($('manual-fasta').value,Number($('fasta-start').value),'FASTA inserito manualmente',false);renderReference();showStatus('FASTA caricato. Coordinate e alleli attesi coerenti; la provenienza deve essere verificata. Le chiamate saranno marcate REVISIONE.','warn');clearResults();}
  catch(err){showStatus(`FASTA non valido: ${err.message}`,'error');}
});
function fileNameList(){
  $('files-selected').textContent=selectedFiles.length?`${selectedFiles.length} file selezionati: ${selectedFiles.map(f=>f.name).slice(0,3).join(', ')}${selectedFiles.length>3?'…':''}`:'Nessun file selezionato';
  $('count-files').textContent=String(selectedFiles.length);
}
function setFiles(list){
  const accepted=Array.from(list).filter(f=>/\.ab1$/i.test(f.name));
  if(accepted.length>100){alert('Carica al massimo 100 file per analisi.');return;}
  if(accepted.some(f=>f.size>20*1024*1024)){alert('Ogni file deve avere dimensioni inferiori a 20 MB.');return;}
  selectedFiles=accepted;fileNameList();clearResults();
}
$('ab1-files').addEventListener('change',e=>setFiles(e.target.files));
const drop=$('drop-zone');
for(const evt of ['dragenter','dragover'])drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.add('dragging');});
for(const evt of ['dragleave','drop'])drop.addEventListener(evt,e=>{e.preventDefault();drop.classList.remove('dragging');});
drop.addEventListener('drop',e=>setFiles(e.dataTransfer.files));
function clearResults(){results=[];$('results').hidden=true;$('results-body').innerHTML='';$('result-counter').textContent='';}
function setProgress(value){$('progress').textContent=value;}
$('analyze-btn').addEventListener('click',async()=>{
  if(!reference){setProgress('Carica prima un riferimento genomico da NCBI oppure un FASTA GRCh38.');return;}
  if(!selectedFiles.length){setProgress('Seleziona almeno un file AB1.');return;}
  const button=$('analyze-btn');button.disabled=true;button.textContent='Analisi in corso…';clearResults();
  const threshold=Number($('threshold').value);
  try{
    for(let i=0;i<selectedFiles.length;i++){
      const f=selectedFiles[i];setProgress(`Analisi ${i+1}/${selectedFiles.length}: ${f.name}`);
      try{
        const trace=parseAB1(await f.arrayBuffer());
        const result=genotypeTrace(trace,reference,threshold);
        results.push({file:f.name,sample:sampleId(f.name),trace,...result,error:''});
      }catch(err){results.push({file:f.name,sample:sampleId(f.name),trace:null,error:err.message,calls:[],haplotype:{label:'NO CALL',copies:'—',kind:'nocall',detail:err.message}});}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    drawResults();setProgress(`Analizzati ${results.length} file. I dati AB1 non sono stati caricati sul server.`);
  }finally{button.disabled=false;button.textContent='Analizza tutti i file';}
});
$('threshold').addEventListener('input',e=>{$('threshold-value').textContent=Number(e.target.value).toFixed(2).replace('.',',');});
function resultStatus(r){return r.error?'NO CALL':r.calls.some(c=>c.status==='NO CALL')?'NO CALL':r.calls.some(c=>c.status==='REVISIONE')?'REVISIONE':'OK';}
function drawResults(){
  $('results').hidden=false;
  const ok=results.filter(r=>resultStatus(r)==='OK').length;
  const review=results.filter(r=>resultStatus(r)==='REVISIONE').length;
  const no=results.length-ok-review;
  $('result-counter').textContent=`${results.length} file · ${ok} OK · ${review} revisione · ${no} NO CALL`;
  $('results-body').innerHTML=results.map((r,i)=>{
    const cells=[...Array(3)].map((_,j)=>{
      const c=r.calls?.[j];return `<td><strong>${htmlEscape(genotypeText(c))}</strong><small>${c?htmlEscape(c.status):'—'}</small></td>`;
    }).join('');
    const kind=resultStatus(r);
    return `<tr data-i="${i}" class="${i===selectedResult?'is-selected':''}" tabindex="0" role="button" aria-label="Visualizza cromatogrammi di ${htmlEscape(r.sample)}"><td><strong>${htmlEscape(r.sample)}</strong><small>${htmlEscape(r.file)}</small></td>${cells}<td><strong>${htmlEscape(r.haplotype.label)}</strong><small>${htmlEscape(r.haplotype.detail)}</small></td><td><span class="status-badge ${kind==='OK'?'ok':kind==='REVISIONE'?'review':'fail'}">${kind}</span></td></tr>`;
  }).join('');
  $('results-body').querySelectorAll('tr').forEach(row=>{
    const select=()=>{selectedResult=Number(row.dataset.i);$('results-body').querySelectorAll('tr').forEach(x=>x.classList.toggle('is-selected',x===row));renderCharts();};
    row.addEventListener('click',select);row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});
  });
  selectedResult=0;renderCharts();
}
function chart(draw,site,call){
  const canvas=draw.canvas, ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas non supportato da questo browser.');
  const width=Math.max(280,Math.floor(canvas.parentElement.clientWidth-2)),height=190;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=width+'px';canvas.style.height=height+'px';
  ctx.scale(dpr,dpr);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  const left=36,right=width-14,top=13,bottom=height-30;
  ctx.strokeStyle='#e4ebf5';ctx.lineWidth=1;
  for(let n=0;n<=3;n++){const y=top+(bottom-top)*n/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}
  const trace=draw.trace,idx=call.rawIndex,center=trace.locations[idx];
  const span=26,first=Math.max(0,idx-span),last=Math.min(trace.calls.length-1,idx+span);
  let lo=Math.max(0,(trace.locations[first]??center)-10),hi=Math.min(trace.scanCount-1,(trace.locations[last]??center)+10);
  if(hi<=lo)throw Error('Intervallo dei picchi non valido.');
  let maximum=1;
  for(const base of 'ACGT'){const a=trace.channels[base];for(let k=lo;k<=hi;k++)maximum=Math.max(maximum,a[k]||0);}
  const xPos=x=>left+(x-lo)/(hi-lo)*(right-left);
  const yPos=y=>bottom-(y/maximum)*(bottom-top-6);
  const colors=BASE_COLORS;
  for(const b of 'ACGT'){
    const a=trace.channels[b];ctx.strokeStyle=colors[b];ctx.lineWidth=1.55;ctx.beginPath();
    for(let k=lo;k<=hi;k++){const x=xPos(k),y=yPos(a[k]||0);if(k===lo)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.stroke();
  }
  const sx=xPos(center);
  ctx.setLineDash([5,4]);ctx.lineWidth=2;ctx.strokeStyle='#855ad8';ctx.beginPath();ctx.moveTo(sx,top);ctx.lineTo(sx,bottom);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#855ad8';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('SNP',sx,11);
  ctx.font='bold 11px system-ui';
  for(let k=first;k<=last;k++){
    if(k%2 && k!==idx)continue;
    const bp=trace.locations[k],x=xPos(bp);if(x<left||x>right)continue;
    ctx.fillStyle=colors[trace.calls[k]]||'#888';ctx.textAlign='center';ctx.fillText(trace.calls[k],x,height-14);
  }
  ctx.textAlign='left';ctx.fillStyle='#687894';ctx.font='10px system-ui';ctx.fillText(`0`,4,bottom);ctx.fillText(`${Math.round(maximum)}`,3,top+10);
}
function renderCharts(){
  const r=results[selectedResult];
  if(!r)return;
  $('trace-title').textContent=`${r.sample} · ${r.file}`;
  $('trace-note').textContent=r.error?`Errore: ${r.error}`:`Lettura ${r.orientation==='-'?'Reverse (complementata)':'Forward'} · ${r.haplotype.label} · ${r.haplotype.detail}`;
  const charts=$('charts');charts.innerHTML='';
  if(!r.trace){charts.innerHTML='<p class="notice error">Il file AB1 non è leggibile.</p>';return;}
  r.calls.forEach((call,i)=>{
    const section=document.createElement('section');section.className='trace-card';
    section.innerHTML=`<div class="trace-top"><div><strong>${SITES[i].rsid}</strong> <span>${SITES[i].protein} · chr13:${SITES[i].pos.toLocaleString('it-IT')}</span></div><div><strong>${htmlEscape(call.genotype)}</strong> <span class="status-badge ${call.status==='OK'?'ok':call.status==='REVISIONE'?'review':'fail'}">${htmlEscape(call.status)}</span></div></div><div class="trace-wrap"><canvas aria-label="Elettroferogramma ${SITES[i].rsid}"></canvas></div><p class="trace-bottom">${htmlEscape(call.reason)} ${call.ratio===null?'':`· Rapporto secondo/primo allele: ${call.ratio.toFixed(3)}`} ${call.phred===null?'':`· Q${call.phred}`} ${call.identity===undefined?'':`· Identità locale: ${(call.identity*100).toFixed(1)}%`}</p>`;
    charts.appendChild(section);
    if(call.status!=='NO CALL'){
      try{chart({trace:r.trace,canvas:section.querySelector('canvas')},SITES[i],call);}
      catch(e){section.querySelector('.trace-wrap').textContent=`Impossibile disegnare il cromatogramma: ${e.message}`;}
    }else{section.querySelector('.trace-wrap').textContent='Cromatogramma non centrabile: '+call.reason;}
  });
}
let resizePending=false;
window.addEventListener('resize',()=>{if(resizePending||!results.length||$('results').hidden)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;renderCharts();});});
function downloadCsv(name,rows){
  const text='\uFEFF'+rows.map(row=>row.map(csvEscape).join(',')).join('\r\n')+'\r\n';
  const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('export-summary').addEventListener('click',()=>{
  if(!results.length)return;
  const head=['Campione','File AB1','Orientamento','F352V rs9536314','C370S rs9527025','K385K rs9527026','Status','KL-VS (copie)','Classificazione','Note','Fonte riferimento'];
  const rows=results.map(r=>[r.sample,r.file,r.orientation||'',...SITES.map((_,i)=>r.calls?.[i]?.genotype||'NO CALL'),resultStatus(r),r.haplotype.copies,r.haplotype.label,r.error||r.haplotype.detail,reference?.source||'']);
  downloadCsv('Klotho_Sanger_riepilogo.csv',[head,...rows]);
});
$('export-detail').addEventListener('click',()=>{
  if(!results.length)return;
  const head=['Campione','File AB1','SNP','Posizione GRCh38','Genotipo','Stato','Orientamento','Phred','Rapporto picchi','Concordanza locale','Haplotype','Note'];
  const rows=results.flatMap(r=>SITES.map((s,i)=>{const c=r.calls?.[i];return [r.sample,r.file,s.rsid,s.pos,c?.genotype||'—',c?.status||'NO CALL',r.orientation||'',c?.phred??'',c?.ratio?.toFixed(4)??'',c?.identity?.toFixed(3)??'',r.haplotype.label,c?.reason||r.error];}));
  downloadCsv('Klotho_Sanger_dettaglio.csv',[head,...rows]);
});
$('threshold-value').textContent=Number($('threshold').value).toFixed(2).replace('.',',');
