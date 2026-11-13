/**
 * NCBI dbSNP validates rsID/GRCh38 coordinates; NCBI EFetch returns genomic FASTA.
 * No AB1 sequence, basecalls or fluorescence traces ever cross this endpoint.
 */
const CHR8_ACC = 'NC_000008.11'; // GRCh38 chr8 primary RefSeq accession
const BASES = new Set(['A','C','G','T']);
const PREFIX = 'SangerSNP-Netlify/3.0 (academic research; reference retrieval)';

function apiResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}
  });
}

async function fetchWithTimeout(url, {kind='json', timeout=23000}={}) {
  const signal = AbortSignal.timeout(timeout);
  let response;
  try {
    response = await fetch(url, {signal, headers:{'Accept': kind === 'json' ? 'application/json' : 'text/plain', 'User-Agent': PREFIX}});
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new Error('NCBI non risponde entro il tempo previsto. Riprovare o usare un FASTA manuale.');
    throw new Error(`Impossibile contattare NCBI: ${err?.message ?? err}`);
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error('rsID non trovato su NCBI dbSNP (HTTP 404).');
    if (response.status === 429) throw new Error('NCBI ha temporaneamente limitato le richieste (HTTP 429). Riprova fra poco.');
    throw new Error(`Servizio NCBI non disponibile (HTTP ${response.status}).`);
  }
  return kind === 'json' ? response.json() : response.text();
}

/** Export for offline unit tests (the function itself is only used by Netlify). */
export function extractPlacement(record, position, accession = CHR8_ACC) {
  const placements = record?.primary_snapshot_data?.placements_with_allele;
  if (!Array.isArray(placements)) return {confirmed:false, alleles:[], positions:[]};
  const all = new Set(); const matches = [];
  for (const placement of placements) {
    for (const a of placement.alleles ?? []) {
      const spdi = a?.allele?.spdi;
      if (!spdi || typeof spdi.seq_id !== 'string' || !Number.isInteger(spdi.position)) continue;
      if (spdi.seq_id.startsWith('NC_')) all.add(`${spdi.seq_id}:${spdi.position+1}`);
      if (spdi.seq_id === accession && spdi.position+1 === position) {
        const deleted = String(spdi.deleted_sequence ?? '').toUpperCase();
        const inserted = String(spdi.inserted_sequence ?? '').toUpperCase();
        // This tool supports single nucleotide substitutions only, not indels.
        if (deleted.length === 1 && inserted.length === 1 && BASES.has(deleted) && BASES.has(inserted)) {
          matches.push({deleted, inserted});
        }
      }
    }
  }
  return {
    confirmed: matches.length > 0,
    alleles: [...new Set(matches.flatMap(m => [m.deleted, m.inserted]))].sort(),
    positions: [...all].slice(0,12)
  };
}

export default async function handler(req) {
  if (req.method !== 'POST') return apiResponse({ok:false, error:'Utilizzare POST.'}, 405);
  let payload;
  try {payload = await req.json();} catch {return apiResponse({ok:false,error:'JSON non valido.'},400);}
  const chrom = String(payload?.chrom ?? '8').replace(/^chr/i,'').trim();
  const position = Number(payload?.pos ?? 46830810);
  const rsid = String(payload?.rsid ?? 'rs113601887').trim().toLowerCase();
  const flank = 500;
  if (chrom !== '8') return apiResponse({ok:false,error:'Questa versione supporta solo chr8 GRCh38.'},400);
  if (!Number.isSafeInteger(position) || position <= flank || position >= 146000000) return apiResponse({ok:false,error:'Posizione genomica non valida.'},400);
  if (!/^rs\d{1,14}$/.test(rsid)) return apiResponse({ok:false,error:'rsID non valido (esempio rs113601887).'},400);
  try {
    const id = rsid.slice(2);
    const record = await fetchWithTimeout(`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id}`);
    if (record.merged_snapshot_data) {
      const newer = record.merged_snapshot_data?.merged_into ?? '?';
      throw new Error(`${rsid} risulta un rsID accorpato (${newer}): controlla il nuovo identificativo su dbSNP.`);
    }
    if (String(record.refsnp_id) !== id) throw new Error('dbSNP ha restituito un identificativo diverso da quello richiesto.');
    const placement = extractPlacement(record, position);
    if (!placement.confirmed) throw new Error(`${rsid} non è confermato come SNP in chr8:${position} su GRCh38 (${CHR8_ACC}). Posizioni riportate: ${placement.positions.join(', ') || 'non disponibili'}.`);
    const start = position - flank;
    const end = position + flank;
    const params = new URLSearchParams({db:'nuccore', id:CHR8_ACC, seq_start:String(start), seq_stop:String(end), strand:'1', rettype:'fasta', retmode:'text'});
    const fasta = await fetchWithTimeout(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${params}`, {kind:'text',timeout:25000});
    if (!fasta.trimStart().startsWith('>')) throw new Error('EFetch non ha restituito un file FASTA.');
    const sequence = fasta.split(/\r?\n/).filter(s => s && !s.startsWith('>')).join('').trim().toUpperCase();
    if (sequence.length !== 1001 || !/^[ACGTN]+$/.test(sequence)) throw new Error(`EFetch ha restituito una sequenza inattesa (${sequence.length} basi).`);
    const refBase = sequence[position-start];
    if (refBase === 'N' || !placement.alleles.includes(refBase)) throw new Error(`Discrepanza: riferimento FASTA ${refBase}, alleli dbSNP ${placement.alleles.join('/')}.`);
    return apiResponse({ok:true, reference:{chrom, pos:position, rsid, build:'GRCh38', accession:CHR8_ACC,
      start, end, sequence, alleles:placement.alleles, ref_base:refBase,
      verified:true, source:'NCBI dbSNP + EFetch (GRCh38)'}});
  } catch (err) {
    return apiResponse({ok:false, error:String(err?.message ?? err)}, 400);
  }
}
