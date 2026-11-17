/** Netlify Function: only public GRCh38 reference sequence is requested. AB1 never leaves browser. */
const CHR='NC_000013.11';
const START=33053770,END=33054300;
const SITES=[{pos:33054001,ref:'T'},{pos:33054056,ref:'G'},{pos:33054102,ref:'G'}];
const json=(status,body)=>({statusCode:status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600'},body:JSON.stringify(body)});
function inspectSequence(sequence){
  const seq=String(sequence).toUpperCase();
  if(seq.length!==END-START+1||!/^[ACGTN]+$/.test(seq))throw Error('Sequenza genomica non valida o incompleta.');
  for(const s of SITES)if(seq[s.pos-START]!==s.ref)throw Error(`Base di riferimento errata a chr13:${s.pos}; attesa ${s.ref}, ottenuta ${seq[s.pos-START]}.`);
  return seq;
}
async function getText(url,ms=12500){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);
  try{
    const r=await fetch(url,{signal:controller.signal,headers:{'accept':'text/plain,application/json'}});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    const body=await r.text();if(body.length>200000)throw Error('Risposta troppo lunga.');return body;
  }finally{clearTimeout(timer);}
}
function parseFasta(text){if(!/^\s*>/.test(text))throw Error('NCBI non ha restituito un FASTA.');return text.split(/\r?\n/).filter(s=>!s.startsWith('>')).join('').replace(/\s/g,'');}
export async function handler(event){
  if(event.httpMethod!=='GET')return json(405,{ok:false,error:'Usa GET.'});
  const warnings=[];
  const url=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi');
  Object.entries({db:'nuccore',id:CHR,seq_start:START,seq_stop:END,strand:1,rettype:'fasta',retmode:'text',tool:'klotho-sanger-browser'}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  try{
    const seq=inspectSequence(parseFasta(await getText(url.toString())));
    return json(200,{ok:true,sequence:seq,chrom:'13',start:START,end:END,build:'GRCh38',accession:CHR,source:'NCBI EFetch (RefSeq NC_000013.11)'});
  }catch(e){warnings.push(`NCBI: ${e.message}`);}
  // Fallback to public UCSC reference service with the same GRCh38 assembly / position validation.
  try{
    const uri=`https://api.genome.ucsc.edu/getData/sequence?genome=hg38&chrom=chr13&start=${START-1}&end=${END}`;
    const obj=JSON.parse(await getText(uri,12500));
    const seq=inspectSequence(obj.dna);
    return json(200,{ok:true,sequence:seq,chrom:'13',start:START,end:END,build:'GRCh38',accession:CHR,source:'UCSC hg38 (fallback dopo errore NCBI)',warnings});
  }catch(e){warnings.push(`UCSC: ${e.message}`);}
  return json(502,{ok:false,error:'Non riesco a recuperare il riferimento GRCh38 né da NCBI né da UCSC. Puoi incollare il FASTA verificato manualmente.',details:warnings});
}
