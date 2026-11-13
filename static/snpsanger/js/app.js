import {parseAB1} from './abif.js';
import {genotypeTrace,parseFasta,BASE_COLORS} from './genotype.js';

const el=id=>document.getElementById(id);
const CACHE_KEY='sangersnp.reference.v3';
const MAX_FILE_SIZE=20*1024*1024;
let selectedFiles=[], verifiedReference=null, results=[], currentResult=-1;
let resizeTimer=null;
const fields=['chrom','pos','start','rsid','fasta'];

function setNotice(id,text,kind='neutral') {
  const target=el(id);target.className=`notice ${kind}`;target.textContent=text;
}
function formValues() {
  const chrom=el('chrom').value.trim().replace(/^chr/i,'');
  const pos=Number(el('pos').value);
  const rsid=el('rsid').value.trim().toLowerCase();
  if(!/^8$/.test(chrom)) throw new Error('Questa versione è dedicata al cromosoma 8.');
  if(!Number.isSafeInteger(pos)||pos<=0) throw new Error('Posizione SNP non valida.');
  if(!/^rs\d+$/.test(rsid)) throw new Error('rsID non valido.');
  return {chrom,pos,rsid};
}
function installReference(reference, message, store=false) {
  verifiedReference=reference?.verified ? reference : null;
  el('chrom').value=reference.chrom;
  el('pos').value=String(reference.pos);
  el('rsid').value=reference.rsid;
  el('start').value=String(reference.start);
  el('fasta').value=`>chr${reference.chrom}:${reference.start}-${reference.end} ${reference.build}\n${reference.sequence.match(/.{1,80}/g).join('\n')}`;
  setNotice('referenceStatus',message,reference.verified?'success':'neutral');
  if(store && reference.verified) {
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(reference));}catch {/* Private browsing or quota */}
  }
}
function getReference() {
  const {chrom,pos,rsid}=formValues();
  const start=Number(el('start').value);
  const manual=parseFasta(el('fasta').value,start,pos,chrom);
  manual.rsid=rsid;
  if(verifiedReference && verifiedReference.sequence===manual.sequence && verifiedReference.start===start && verifiedReference.pos===pos && verifiedReference.chrom===chrom && verifiedReference.rsid===rsid) {
    return verifiedReference;
  }
  return manual;
}
function invalidateReference() {
  if(verifiedReference) {
    verifiedReference=null;
    setNotice('referenceStatus','Riferimento modificato: la verifica NCBI precedente non è più valida. Recuperalo nuovamente o usa il FASTA manuale.','neutral');
  }
}
for (const id of fields) el(id).addEventListener('input',invalidateReference);

el('fetchRef').addEventListener('click',async ()=>{
  let input;
  try{input=formValues();}catch(e){setNotice('referenceStatus',e.message,'error');return;}
  el('fetchRef').disabled=true;
  setNotice('referenceStatus','Contatto NCBI dbSNP, verifico rsID/coordinate e scarico FASTA GRCh38…','pending');
  try {
    const response=await fetch('/.netlify/functions/sangersnp-reference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(55000)});
    let data;
    try{data=await response.json();}catch {throw new Error(`Risposta del server Netlify non valida (HTTP ${response.status}). Controlla il deploy delle Functions.`);}
    if(!response.ok || !data.ok) throw new Error(data.error || `Errore HTTP ${response.status}`);
    installReference(data.reference,`Riferimento verificato da NCBI: ${data.reference.accession}:${data.reference.pos} · Alleli ${data.reference.alleles.join('/')} · Base di riferimento ${data.reference.ref_base}.`,true);
  } catch(e) {
    const friendly=e?.name==='TimeoutError'?'Tempo massimo scaduto: servizio NCBI lento. Usa un FASTA verificato o riprova.':e?.message;
    setNotice('referenceStatus',`Recupero non riuscito: ${friendly}`,'error');
  } finally {el('fetchRef').disabled=false;}
});

el('cacheRef').addEventListener('click',()=>{
  try{
    const cached=JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    if(!cached?.verified || !/^[ACGTN]{65,}$/.test(cached.sequence) || !Number.isSafeInteger(cached.start)) throw new Error('Nessun riferimento NCBI verificato salvato in questo browser.');
    installReference(cached,'Riferimento verificato in precedenza, recuperato dalla cache di questo browser.');
  } catch(e){setNotice('referenceStatus',e.message,'error');}
});

function updateFiles(files) {
  selectedFiles=[...files];
  if(selectedFiles.length===0) el('fileNames').textContent='Nessun file selezionato';
  else el('fileNames').textContent=`${selectedFiles.length} file selezionati: ${selectedFiles.slice(0,9).map(f=>f.name).join(' · ')}${selectedFiles.length>9 ? ' …' : ''}`;
  results=[];currentResult=-1;el('resultsPanel').hidden=true;el('exportCsv').disabled=true;
  setNotice('analysisStatus',`Pronti ${selectedFiles.length} file; l’analisi viene eseguita soltanto su questo dispositivo.`);
}
el('files').addEventListener('change',e=>updateFiles(e.target.files));
const dz=el('dropzone');
dz.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target===dz){e.preventDefault();el('files').click();}});
for(const type of ['dragenter','dragover'])dz.addEventListener(type,e=>{e.preventDefault();dz.classList.add('drag-over');});
for(const type of ['dragleave','drop'])dz.addEventListener(type,e=>{e.preventDefault();dz.classList.remove('drag-over');});
dz.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length)updateFiles(e.dataTransfer.files);});
el('hetThreshold').addEventListener('input',e=>el('rangeValue').textContent=Number(e.target.value).toFixed(2).replace('.',','));

function addCell(row,text,cls) {const td=document.createElement('td');td.textContent=String(text);if(cls)td.className=cls;row.append(td);return td;}
function renderResults(){
  el('resultsPanel').hidden=false;
  const counts={OK:0,REVISIONE:0,'NO CALL':0};
  results.forEach(r=>counts[r.result.status]++);
  el('summaryText').textContent=`${results.length} file · ${counts.OK} OK · ${counts.REVISIONE} revisione · ${counts['NO CALL']} no call`;
  const tbody=el('resultRows');tbody.replaceChildren();
  results.forEach((record,index)=>{
    const r=record.result,row=document.createElement('tr');
    row.tabIndex=0;
    if(index===currentResult)row.className='selected';
    addCell(row,record.name);addCell(row,r.genotype||'—','mono');
    const cell=document.createElement('td'),span=document.createElement('span');
    span.className=`status-chip ${r.status==='OK'?'ok':r.status==='REVISIONE'?'review':'no'}`;
    span.textContent=r.status;cell.append(span);row.append(cell);
    addCell(row,r.strand??'—');addCell(row,Number.isFinite(r.peakRatio)?r.peakRatio.toFixed(3):'—','mono');
    addCell(row,Number.isFinite(r.concordance)?`${r.concordance.toFixed(1)}%`:'—','mono');
    row.addEventListener('click',()=>selectResult(index));
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectResult(index);}});
    tbody.append(row);
  });
  if(results.length && currentResult<0)selectResult(0);
}
function selectResult(index){
  currentResult=index;
  [...el('resultRows').children].forEach((tr,i)=>tr.classList.toggle('selected',i===index));
  const record=results[index],r=record?.result;
  if(!record)return;
  el('detail').hidden=false;
  el('detailTitle').textContent=record.name;
  el('detailInfo').textContent=`${r.status}${r.strand?` · Lettura ${r.strand==='+'?'Forward':'Reverse'}`:''} · ${r.genotype||'—'}`;
  el('detailReason').textContent=r.reason || 'Verifica visivamente la morfologia dei picchi e l’allineamento.';
  drawTrace(record);
}

function drawTrace(record){
  const canvas=el('traceCanvas'),rect=canvas.getBoundingClientRect();
  if(!rect.width || !rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=rect.width,H=rect.height;
  ctx.clearRect(0,0,W,H);
  const pad={left:49,right:17,top:27,bottom:37},pw=W-pad.left-pad.right,ph=H-pad.top-pad.bottom;
  const trace=record.trace, result=record.result;
  if(!trace){ctx.fillStyle='#5d6f89';ctx.font='13px sans-serif';ctx.fillText('Impossibile visualizzare: file AB1 non letto.',20,50);return;}
  const center=Number.isFinite(result.center)?result.center:trace.locations[Math.floor(trace.locations.length/2)];
  const low=Math.max(0,center-150),high=Math.min(trace.scanCount-1,center+150);
  const scans=high-low || 1;
  const max=Math.max(1,...Array.from('ACGT',b=>{let v=0;for(let i=low;i<=high;i++) v=Math.max(v,trace.channels[b][i]);return v;}));
  const x=p=>pad.left+(p-low)/scans*pw;
  const y=v=>pad.top+ph-(v/max)*ph;
  ctx.strokeStyle='#e6edf5';ctx.lineWidth=1;ctx.fillStyle='#8897ae';ctx.font='11px sans-serif';
  for(let t=0;t<=4;t++){const yy=pad.top+ph*t/4;ctx.beginPath();ctx.moveTo(pad.left,yy);ctx.lineTo(W-pad.right,yy);ctx.stroke();ctx.fillText(String(Math.round(max*(1-t/4))),4,yy+4);}
  for(let t=0;t<=4;t++){const p=low+(high-low)*t/4;const xx=x(p);ctx.beginPath();ctx.moveTo(xx,pad.top);ctx.lineTo(xx,pad.top+ph);ctx.stroke();ctx.fillText(String(Math.round(p)),xx-11,H-9);}
  ctx.strokeStyle='#b0c0d4';ctx.strokeRect(pad.left,pad.top,pw,ph);
  for(const b of 'ACGT'){
    const a=trace.channels[b];ctx.strokeStyle=BASE_COLORS[b];ctx.lineWidth=1.7;ctx.beginPath();
    for(let i=low;i<=high;i++){const xx=x(i),yy=y(a[i]);if(i===low)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.stroke();
  }
  const inView=Array.from(trace.locations,(p,i)=>({p,i})).filter(o=>o.p>low && o.p<high);
  ctx.font='bold 12px ui-monospace,monospace';ctx.textAlign='center';
  for(const {p,i} of inView){const b=trace.calls[i];ctx.fillStyle=BASE_COLORS[b]||'#8d98a8';ctx.fillText(b,x(p),18);}
  ctx.textAlign='left';
  if(Number.isFinite(result.center)){
    const xx=x(result.center);ctx.strokeStyle='#9852d3';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(xx,pad.top);ctx.lineTo(xx,pad.top+ph);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#9852d3';ctx.font='bold 11px sans-serif';ctx.fillText('SNP',Math.min(W-50,xx+5),pad.top+13);
  }
  ctx.fillStyle='#8493aa';ctx.font='11px sans-serif';ctx.fillText('Fluorescenza',5,12);
}
window.addEventListener('resize',()=>{if(resizeTimer)clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(currentResult>=0)drawTrace(results[currentResult]);},130);});

el('analyze').addEventListener('click',async()=>{
  if(!selectedFiles.length){setNotice('analysisStatus','Seleziona almeno un file AB1.','error');return;}
  if(selectedFiles.length>100){setNotice('analysisStatus','Massimo 100 file per analisi.','error');return;}
  let reference;
  try{reference=getReference();}catch(e){setNotice('analysisStatus',`Riferimento non valido: ${e.message}`,'error');return;}
  const threshold=Number(el('hetThreshold').value);
  const button=el('analyze');button.disabled=true;
  results=[];currentResult=-1;el('resultsPanel').hidden=true;el('exportCsv').disabled=true;
  let processed=0;
  for(const file of selectedFiles){
    setNotice('analysisStatus',`Analisi ${processed+1}/${selectedFiles.length}: ${file.name}…`,'pending');
    // Yield to UI so the browser keeps the progress status visible.
    await new Promise(resolve=>setTimeout(resolve,0));
    let trace=null,result;
    try{
      if(!/\.ab1$|\.abi$/i.test(file.name)) throw new Error('Estensione file diversa da .ab1/.abi.');
      if(file.size>MAX_FILE_SIZE) throw new Error('File superiore a 20 MB.');
      trace=parseAB1(await file.arrayBuffer());
      result=genotypeTrace(trace,reference,threshold);
    }catch(e){result={status:'NO CALL',genotype:'—',reason:e.message || 'Errore di lettura non specificato.'};}
    results.push({name:file.name,trace,result});processed++;
  }
  el('exportCsv').disabled=false;button.disabled=false;
  renderResults();
  const checked=reference.verified?'verificato NCBI':'FASTA manuale NON verificato';
  setNotice('analysisStatus',`Elaborati ${processed} file in questo browser. Riferimento: ${checked}. Controllare visivamente ogni chiamata.`,reference.verified?'success':'neutral');
});

function csvValue(x){
  let s=String(x??'');
  if(/^[\s\r\n]*[=+@-]/.test(s))s="'"+s; // mitigate spreadsheet formula injection in file names/notes
  return '"'+s.replace(/"/g,'""')+'"';
}
el('exportCsv').addEventListener('click',()=>{
  if(!results.length)return;
  const hdr=['File','Cromosoma','Posizione_GRCh38','rsID','Genotipo','Stato','Orientamento','Rapporto_picchi','Concordanza_percento','Phred','Picco_A','Picco_C','Picco_G','Picco_T','Riferimento_verificato','Motivo'];
  const lines=[hdr.map(csvValue).join(';')];
  let ref;
  try{ref=getReference();}catch{ref={chrom:'8',pos:'',rsid:'',verified:false};}
  results.forEach(({name,result:r})=>{
    const values=[name,ref.chrom,ref.pos,ref.rsid,r.genotype,r.status,r.strand??'',r.peakRatio?.toFixed(3)??'',r.concordance?.toFixed(1)??'',r.phred??'',r.heights?.A??'',r.heights?.C??'',r.heights?.G??'',r.heights?.T??'',ref.verified?'SI':'NO',r.reason];
    lines.push(values.map(csvValue).join(';'));
  });
  const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`SangerSNP_${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
