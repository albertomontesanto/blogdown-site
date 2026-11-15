const BASES = new Set(['A','C','G','T']);
const COMPLEMENT = {A:'T',T:'A',C:'G',G:'C',N:'N',R:'Y',Y:'R',S:'S',W:'W',K:'M',M:'K',B:'V',V:'B',D:'H',H:'D'};
export const BASE_COLORS = {A:'#25a66b', C:'#317bdc', G:'#374151', T:'#ed5a5e'};

export function reverseComplement(s) {
  return [...s.toUpperCase()].reverse().map(c=>COMPLEMENT[c] ?? 'N').join('');
}
// SANGERSNP_ALL_CHROMOSOMES_v4: no chromosome-specific assumptions in manual FASTA validation.
export function parseFasta(text, start, pos, chrom) {
  const lines=String(text ?? '').split(/\r?\n/);
  const header=lines.find(x=>x.trimStart().startsWith('>')) ?? '';
  const seq=lines.filter(x=>!x.trim().startsWith('>')).join('').replace(/\s+/g,'').toUpperCase();
  if(!seq || !/^[ACGTN]+$/.test(seq)) throw new Error('Il FASTA deve contenere solamente A, C, G, T oppure N.');
  if(!Number.isSafeInteger(start) || start<=0) throw new Error('Inserisci una coordinata iniziale FASTA valida (1-based).');
  if(!Number.isSafeInteger(pos) || pos<start+30 || pos>start+seq.length-31) throw new Error('Il SNP non è coperto dal FASTA con almeno 30 basi su entrambi i lati. Controlla le coordinate.');
  const headerRegion=header.match(/(?:chr)?([1-9]|1\d|2[0-2]|X|Y):(\d+)[-–](\d+)/i);
  if(headerRegion) {
    const headerChrom=headerRegion[1].toUpperCase();
    if(headerChrom!==String(chrom).toUpperCase()) throw new Error(`Il FASTA riguarda chr${headerChrom}, ma è stato selezionato chr${chrom}.`);
    if(Number(headerRegion[2])!==start) throw new Error(`Il FASTA indica inizio ${headerRegion[2]}, ma il campo Inizio FASTA contiene ${start}.`);
    if(Number(headerRegion[3])!==start+seq.length-1) throw new Error('Le coordinate del FASTA non corrispondono alla lunghezza della sequenza.');
  }
  return {sequence:seq,start,end:start+seq.length-1,chrom,pos,rsid:'',build:'GRCh38 (dichiarato)',source:'FASTA manuale: coordinate e alleli non verificati',
    alleles:[],ref_base:seq[pos-start],verified:false};
}

/** Smith-Waterman local alignment, linear gap costs; returns reference->read mapping. */
export function localAlign(reference, read) {
  const n=reference.length, m=read.length;
  // Bounds against pathological reference/read sizes causing browser memory exhaustion.
  if(n<30 || m<30 || n>10000 || m>15000 || n*m>6_000_000) throw new Error('Sequenza troppo lunga per l’allineamento locale nel browser. Usa un riferimento di circa 1.001 bp.');
  const width=m+1, total=(n+1)*width;
  const H=new Int16Array(total);
  const D=new Uint8Array(total); // 0 stop, 1 diagonal, 2 up, 3 left
  let max=0, best=0;
  for(let i=1;i<=n;i++) {
    const row=i*width, prev=(i-1)*width, rb=reference.charCodeAt(i-1);
    for(let j=1;j<=m;j++) {
      const q=read.charCodeAt(j-1);
      const diag=H[prev+j-1] + ((rb===q && rb!==78) ? 2 : -3);
      const up=H[prev+j]-5, left=H[row+j-1]-5;
      let s=0, dir=0;
      if(diag>s){s=diag;dir=1;}
      if(up>s){s=up;dir=2;}
      if(left>s){s=left;dir=3;}
      H[row+j]=s;D[row+j]=dir;
      if(s>max){max=s;best=row+j;}
    }
  }
  const refToRead=new Map();
  let i=Math.floor(best/width),j=best%width, matches=0, aligned=0;
  while(i>0 && j>0 && D[i*width+j]!==0) {
    const dir=D[i*width+j];
    if(dir===1) {
      refToRead.set(i-1,j-1);
      if(reference[i-1]===read[j-1]) matches++;
      aligned++; i--;j--;
    } else if(dir===2) {i--;} else {j--;}
  }
  return {refToRead,score:max,matches,aligned};
}

function noCall(reason, extra={}) {return {status:'NO CALL',genotype:'—',reason,...extra};}

/** Called genotype is always in the GRCh38 forward-reference orientation. */
export function genotypeTrace(trace, reference, threshold=0.28) {
  const seq=reference?.sequence;
  if(!seq) throw new Error('Riferimento genomico assente.');
  const locus=reference.pos-reference.start;
  if(locus<30 || locus>=seq.length-30) return noCall('SNP fuori dal riferimento o troppo vicino ai bordi.');
  if(!Number.isFinite(threshold) || threshold<0.15 || threshold>0.8) throw new Error('Soglia eterozigosi non valida.');
  const orientations=[['+',trace.calls],['-',reverseComplement(trace.calls)]];
  const candidates=[];
  for(const [strand,calls] of orientations) {
    const aligned=localAlign(seq,calls);
    if(!aligned.refToRead.has(locus)) continue;
    const localIndexes=[];
    for(let k=locus-25;k<=locus+25;k++) if(aligned.refToRead.has(k)) localIndexes.push(k);
    if(localIndexes.length<37 || !Array.from({length:11},(_,k)=>locus-5+k).every(k=>aligned.refToRead.has(k))) continue;
    let bad=0;
    for(const k of localIndexes) if(BASES.has(calls[aligned.refToRead.get(k)]) && BASES.has(seq[k]) && seq[k]!==calls[aligned.refToRead.get(k)]) bad++;
    const concordance=1-bad/localIndexes.length;
    const readIdx=aligned.refToRead.get(locus);
    const rawIndex=strand==='+' ? readIdx : trace.calls.length-1-readIdx;
    candidates.push({...aligned,concordance,strand,rawIndex,localIndexes});
  }
  if(!candidates.length) return noCall('Nessun allineamento continuo copre il SNP. Verifica amplicone e coordinate.');
  // Higher-scoring alignment receives priority. Concordance is used for ties.
  candidates.sort((a,b)=>b.score-a.score || b.concordance-a.concordance);
  const c=candidates[0];
  const center=trace.locations[c.rawIndex];
  if(!Number.isFinite(center) || center<3 || center>=trace.scanCount-3) return noCall('Posizione SNP non rappresentabile nel cromatogramma.');
  const peaks={};
  for(const base of 'ACGT') {
    const a=trace.channels[base];
    let max=0;
    for(let i=center-2;i<=center+2;i++) max=Math.max(max,a[i]??0);
    peaks[c.strand==='-' ? COMPLEMENT[base] : base]=max;
  }
  const ranked=Object.entries(peaks).sort((a,b)=>b[1]-a[1]);
  const [[first,p1],[second,p2]]=ranked;
  const ratio=p1>0?p2/p1:0;
  let neighborMax=0, baseline=[];
  for(const b of 'ACGT') {
    const a=trace.channels[b];
    for(let i=Math.max(0,center-80);i<=Math.min(a.length-1,center+80);i++) neighborMax=Math.max(neighborMax,a[i]);
    const rough=[];
    for(let i=Math.max(0,center-80);i<=Math.min(a.length-1,center+80);i+=3) rough.push(a[i]);
    rough.sort((a,b)=>a-b);baseline.push(rough[Math.floor(rough.length/2)] || 0);
  }
  baseline.sort((a,b)=>a-b);
  const background=Math.max(1,(baseline[1]+baseline[2])/2);
  const snr=p1/background;
  const quality=trace.qualities[c.rawIndex] ?? null;
  const metadata={strand:c.strand,peakRatio:ratio,heights:peaks,center,rawIndex:c.rawIndex,
    phred:quality,score:c.score,concordance:c.concordance*100,referenceBase:reference.ref_base};
  if(c.concordance<0.8) return noCall('Concordanza locale con il riferimento inferiore all’80%.',metadata);
  if(p1<60 || p1<neighborMax*0.12) return noCall('Segnale alla posizione SNP troppo debole.',metadata);
  if(snr<2) return noCall('Il picco SNP non si distingue sufficientemente dal fondo.',metadata);
  // Two near-equal dye peaks are compatible with a true heterozygote.
  // Do not discard them merely because their relative heights are similar.
  const hetero=ratio>=threshold;
  if(hetero && p2/background<1.6) return noCall('Il picco secondario non supera sufficientemente il rumore di fondo.',metadata);
  const genotype=hetero?[first,second].sort().join('/'):first+'/'+first;
  if(reference.verified && reference.alleles?.length && genotype.split('/').some(b=>!reference.alleles.includes(b))) {
    return noCall(`Allele ${genotype} incompatibile con gli alleli verificati in dbSNP (${reference.alleles.join('/')}).`,metadata);
  }
  const review=(hetero && ratio>=0.58) || (!hetero && ratio>=threshold-0.07) || c.concordance<0.90;
  return {...metadata,status:review?'REVISIONE':'OK',genotype,
    reason:review?'Segnale ambiguo o concordanza locale da verificare visivamente.':'Chiamata automatica preliminare: confermare sui cromatogrammi.'};
}
