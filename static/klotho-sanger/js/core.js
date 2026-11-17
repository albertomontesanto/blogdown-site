/** KLOTHO exon 2 KL-VS Sanger research genotyping. All alleles are genomic plus GRCh38. */
export const SITES = Object.freeze([
  {rsid:'rs9536314', protein:'F352V', pos:33054001, ref:'T', alt:'G', effect:'Missenso'},
  {rsid:'rs9527025', protein:'C370S', pos:33054056, ref:'G', alt:'C', effect:'Missenso'},
  {rsid:'rs9527026', protein:'K385K', pos:33054102, ref:'G', alt:'A', effect:'Sinonima'}
]);
export const BASE_COLORS = {A:'#159b73',C:'#297bd8',G:'#364152',T:'#ed5965'};
const COMPLEMENT={A:'T',T:'A',C:'G',G:'C',N:'N',R:'Y',Y:'R',S:'S',W:'W',K:'M',M:'K',B:'V',V:'B',D:'H',H:'D'};
export const reverseComplement=s=>[...s.toUpperCase()].reverse().map(c=>COMPLEMENT[c]||'N').join('');
export function parseReference(text,start,source='Manuale',verified=false){
  if(!Number.isSafeInteger(start)||start<=0)throw Error('Inserisci una coordinata iniziale FASTA valida (1-based).');
  const lines=String(text||'').split(/\r?\n/);let header='';
  const sequence=lines.filter(line=>{if(line.trim().startsWith('>')){header ||=line.trim();return false;}return true;}).join('').replace(/\s/g,'').toUpperCase();
  if(!sequence||!(/^[ACGTN]+$/).test(sequence))throw Error('Sequenza FASTA non valida: consentiti A/C/G/T/N.');
  if(sequence.length>4000)throw Error('Il FASTA non può superare 4.000 bp.');
  const hm=header.match(/(?:chr)?(\d+|X|Y):(\d+)[-–](\d+)/i);
  if(hm && (hm[1].toUpperCase()!=='13'||+hm[2]!==start||(+hm[3]!==start+sequence.length-1)))
    throw Error('Header FASTA non coerente con chr13, coordinata iniziale o lunghezza.');
  const end=start+sequence.length-1;
  for(const site of SITES){
    const ix=site.pos-start;
    if(ix<24||ix>=sequence.length-24)throw Error(`Il FASTA non copre ${site.rsid} con almeno 24 bp ai lati.`);
    if(sequence[ix]!==site.ref)throw Error(`Riferimento non coerente a ${site.rsid} (chr13:${site.pos}): attesa ${site.ref}, trovato ${sequence[ix]}. Controlla GRCh38 e strand.`);
  }
  return {sequence,start,end,source,verified,accession:'NC_000013.11',build:'GRCh38/hg38'};
}
export function localAlign(reference,read){
  const n=reference.length,m=read.length;
  if(n<100||m<70||n>4000||m>2500||n*m>4_500_000)throw Error('Lunghezza di sequenza non supportata per l’allineamento.');
  const width=m+1,total=(n+1)*width,H=new Int16Array(total),D=new Uint8Array(total);
  let score=0,best=0;
  for(let i=1;i<=n;i++){
    const row=i*width,prior=(i-1)*width;
    for(let j=1;j<=m;j++){
      const diag=H[prior+j-1]+(reference[i-1]===read[j-1]&&reference[i-1]!=='N'?2:-3);
      const up=H[prior+j]-5,left=H[row+j-1]-5;
      let v=0,dir=0;
      if(diag>v){v=diag;dir=1;}if(up>v){v=up;dir=2;}if(left>v){v=left;dir=3;}
      H[row+j]=v;D[row+j]=dir;
      if(v>score){score=v;best=row+j;}
    }
  }
  const map=new Map();let i=Math.floor(best/width),j=best%width,matched=0,aligned=0;
  while(i>0&&j>0){const dir=D[i*width+j];if(!dir)break;
    if(dir===1){map.set(i-1,j-1);if(reference[i-1]===read[j-1])matched++;i--;j--;aligned++;}
    else if(dir===2){i--;}else{j--;}
  }
  return {map,score,matched,aligned};
}
function basicNoCall(site,reason,meta={}){
  return {rsid:site.rsid,protein:site.protein,pos:site.pos,ref:site.ref,alt:site.alt,status:'NO CALL',genotype:'—',reason,ratio:null,phred:null,...meta};
}
function calculatePeaks(trace,index,strand){
  const scan=trace.locations[index];
  if(scan<4||scan>=trace.scanCount-4)return null;
  const heights={};for(const base of 'ACGT'){
    const a=trace.channels[base];let max=0;
    for(let x=scan-2;x<=scan+2;x++)max=Math.max(max,a[x]||0);
    heights[strand==='-'?COMPLEMENT[base]:base]=max;
  }
  const around=[];let nearbyMax=0;
  for(const base of 'ACGT'){
    const a=trace.channels[base],low=Math.max(0,scan-90),high=Math.min(trace.scanCount-1,scan+90),v=[];
    for(let x=low;x<=high;x+=4)v.push(a[x]||0);
    v.sort((x,y)=>x-y);around.push(v[Math.floor(v.length/2)]||0);
    for(let x=low;x<=high;x++)nearbyMax=Math.max(nearbyMax,a[x]||0);
  }
  around.sort((x,y)=>x-y);
  return {heights,scan,nearbyMax,noise:Math.max(1,(around[1]+around[2])/2)};
}
function callAtSite(trace,ref,site,orientation,threshold){
  const offset=site.pos-ref.start,idx=orientation.alignment.map.get(offset);
  if(idx===undefined)return basicNoCall(site,'Sito non coperto dalla lettura.');
  const map=orientation.alignment.map;
  let seen=0,valid=0;const arr=orientation.oriented;
  for(let x=offset-22;x<=offset+22;x++){
    if(x<0||x>=ref.sequence.length||!map.has(x))continue;
    const g=ref.sequence[x],r=arr[map.get(x)];
    if(SITES.some(s=>s.pos-ref.start===x))continue;
    if('ACGT'.includes(g)&&'ACGT'.includes(r)){valid++;if(g===r)seen++;}
  }
  const coverage=Array.from({length:9},(_,k)=>offset-4+k).every(x=>map.has(x));
  if(valid<26||!coverage)return basicNoCall(site,'Copertura o allineamento insufficienti attorno al SNP.');
  const identity=seen/valid;
  const rawIndex=orientation.strand==='+'?idx:trace.calls.length-1-idx;
  const signal=calculatePeaks(trace,rawIndex,orientation.strand);
  const meta={strand:orientation.strand,rawIndex,readIndex:idx,identity,phred:trace.qualities[rawIndex]??null,signal,readBase:trace.calls[rawIndex]};
  if(!signal)return basicNoCall(site,'Picco fuori dal tracciato.',meta);
  const {heights,noise,nearbyMax}=signal;
  const hR=heights[site.ref]||0,hA=heights[site.alt]||0;
  const hOther=Math.max(...Object.entries(heights).filter(([b])=>b!==site.ref&&b!==site.alt).map(([,h])=>h));
  const big=Math.max(hR,hA),small=Math.min(hR,hA),ratio=big?small/big:0;
  Object.assign(meta,{ratio,refHeight:hR,altHeight:hA,snr:big/noise});
  if(identity<0.82)return basicNoCall(site,'Concordanza locale sotto 82%; verifica il riferimento.',meta);
  if(big<60||big<nearbyMax*0.08||big/noise<2.0)return basicNoCall(site,'Picco troppo debole o rapporto segnale/rumore insufficiente.',meta);
  if(hOther>big*0.45)return basicNoCall(site,'Picco non atteso troppo intenso: lettura ambigua.',meta);
  if(meta.phred!==null&&meta.phred<12)return basicNoCall(site,'Qualità Phred inferiore a 12.',meta);
  let genotype;
  if(ratio>=threshold){
    if(small/noise<1.8)return basicNoCall(site,'Secondo picco vicino al fondo: eterozigosi non confermabile.',meta);
    genotype=[site.ref,site.alt].sort().join('/');
  }else if(hR>hA){genotype=`${site.ref}/${site.ref}`;}
  else{genotype=`${site.alt}/${site.alt}`;}
  const uncertain=(ratio>=threshold-0.07&&ratio<threshold+0.05)||identity<0.93||(meta.phred!==null&&meta.phred<25)||!ref.verified;
  return {...meta,rsid:site.rsid,protein:site.protein,pos:site.pos,ref:site.ref,alt:site.alt,genotype,
    status:uncertain?'REVISIONE':'OK',
    reason:!ref.verified?'Riferimento FASTA non verificato indipendentemente.':uncertain?'Controlla qualità, picco secondario e allineamento.':'Chiamata Sanger preliminare.'};
}
export function classifyHaplotype(calls){
  if(calls.length!==3||calls.some(c=>c.status==='NO CALL'))return {copies:'—',label:'Non determinabile',detail:'Uno o più SNP non sono interpretabili.',kind:'nocall'};
  const categories=calls.map((c,i)=>{
    const s=SITES[i],ref=`${s.ref}/${s.ref}`,alt=`${s.alt}/${s.alt}`,het=[s.ref,s.alt].sort().join('/');
    return c.genotype===ref?'reference':c.genotype===alt?'variant':c.genotype===het?'heterozygous':'unexpected';
  });
  if(categories.every(x=>x==='reference'))return {copies:'0',label:'KL-FC / KL-FC',detail:'Tre loci omozigoti per gli alleli di riferimento.',kind:'reference'};
  if(categories.every(x=>x==='variant'))return {copies:'2',label:'KL-VS / KL-VS',detail:'Tre loci omozigoti per gli alleli alternativi (profilo classico).',kind:'variant'};
  if(categories.every(x=>x==='heterozygous'))return {copies:'1*',label:'KL-FC / KL-VS compatibile',detail:'Tripla eterozigosi; fase allelica non dimostrata da Sanger bulk.',kind:'candidate'};
  return {copies:'—',label:'Profilo non classico',detail:'Combinazione discordante fra i tre loci: non assegnare automaticamente KL-VS.',kind:'discordant'};
}
export function genotypeTrace(trace,reference,threshold=.28){
  if(!reference||!trace)throw Error('Riferimento o tracciato assente.');
  if(!Number.isFinite(threshold)||threshold<.16||threshold>.55)throw Error('Soglia di eterozigosi non valida.');
  const reads=[['+',trace.calls],['-',reverseComplement(trace.calls)]];
  const candidates=reads.map(([strand,oriented])=>{
    const alignment=localAlign(reference.sequence,oriented);
    const coverage=SITES.reduce((sum,s)=>sum+(alignment.map.has(s.pos-reference.start)?1:0),0);
    return {strand,oriented,alignment,coverage};
  }).sort((a,b)=>b.coverage-a.coverage||b.alignment.score-a.alignment.score);
  const best=candidates[0];
  const calls=SITES.map(site=>callAtSite(trace,reference,site,best,threshold));
  return {orientation:best.strand,score:best.alignment.score,coverage:best.coverage,calls,
    haplotype:classifyHaplotype(calls)};
}
export function sampleId(name){
  const base=String(name).replace(/\.ab1$/i,'');
  const match=base.match(/SADEL\d+|(?:SAMPLE|CAMPIONE)[_-]?[A-Z0-9]+/i);
  return match?match[0].toUpperCase():base;
}
export function csvEscape(value){
  const s=String(value??'');
  const safe=/^[=+@\-\t\r]/.test(s)?"'"+s:s;
  return '"'+safe.replace(/"/g,'""')+'"';
}
