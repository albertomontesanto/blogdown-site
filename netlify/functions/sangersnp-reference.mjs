/**
 * NCBI dbSNP validates rsID/GRCh38 coordinates; NCBI EFetch returns genomic FASTA.
 * No AB1 sequence, basecalls or fluorescence traces ever cross this endpoint.
 */
// SANGERSNP_ALL_CHROMOSOMES_v4 — GRCh38.p14 primary chromosomes (NCBI GRC).
const CHROMOSOMES=Object.freeze({
  '1':{accession:'NC_000001.11',length:248956422},
  '2':{accession:'NC_000002.12',length:242193529},
  '3':{accession:'NC_000003.12',length:198295559},
  '4':{accession:'NC_000004.12',length:190214555},
  '5':{accession:'NC_000005.10',length:181538259},
  '6':{accession:'NC_000006.12',length:170805979},
  '7':{accession:'NC_000007.14',length:159345973},
  '8':{accession:'NC_000008.11',length:145138636},
  '9':{accession:'NC_000009.12',length:138394717},
  '10':{accession:'NC_000010.11',length:133797422},
  '11':{accession:'NC_000011.10',length:135086622},
  '12':{accession:'NC_000012.12',length:133275309},
  '13':{accession:'NC_000013.11',length:114364328},
  '14':{accession:'NC_000014.9',length:107043718},
  '15':{accession:'NC_000015.10',length:101991189},
  '16':{accession:'NC_000016.10',length:90338345},
  '17':{accession:'NC_000017.11',length:83257441},
  '18':{accession:'NC_000018.10',length:80373285},
  '19':{accession:'NC_000019.10',length:58617616},
  '20':{accession:'NC_000020.11',length:64444167},
  '21':{accession:'NC_000021.9',length:46709983},
  '22':{accession:'NC_000022.11',length:50818468},
  'X':{accession:'NC_000023.11',length:156040895},
  'Y':{accession:'NC_000024.10',length:57227415},
});
// SANGERSNP_NCBI_FIX_v4_1 — diagnostics and flexible RefSNP JSON handling
const NCBI_PATCH_VERSION='4.1';
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
export function extractPlacement(record, position, accession = CHROMOSOMES['8'].accession) {
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
  if (req.method === 'GET') return apiResponse({ok:true,version:NCBI_PATCH_VERSION,service:'SNPSanger NCBI reference',build:'GRCh38'});
  if (req.method !== 'POST') return apiResponse({ok:false, error:'Utilizzare POST.'}, 405);
  let payload;
  try {payload = await req.json();} catch {return apiResponse({ok:false,error:'JSON non valido.'},400);}
  const entered = String(payload?.chrom ?? '').replace(/^chr/i,'').trim().toUpperCase();
  const chrom = /^\d+$/.test(entered) ? String(Number(entered)) : entered;
  const position = Number(payload?.pos);
  const rsid = String(payload?.rsid ?? '').trim().toLowerCase();
  const flank = 500;
  if (!/^(?:[1-9]|1\d|2[0-2]|X|Y)$/.test(chrom)) return apiResponse({ok:false,error:'Cromosoma non valido: ammessi 1–22, X e Y su GRCh38.'},400);
  const {accession, length} = CHROMOSOMES[chrom];
  if (!Number.isSafeInteger(position) || position <= flank || position + flank > length) return apiResponse({ok:false,error:`Posizione genomica non valida per chr${chrom}; servono almeno ${flank} basi per lato.`},400);
  if (!/^rs\d{1,14}$/.test(rsid)) return apiResponse({ok:false,error:'rsID non valido (esempio rs113601887).'},400);
  try {
    const id = rsid.slice(2);
    const rawRecord = await fetchWithTimeout(`https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/${id}`);
    // NCBI JSON can be returned as a bare RefSNP object or wrapped in {data: {...}}.
    const record = rawRecord?.data && typeof rawRecord.data === 'object' ? rawRecord.data : rawRecord;
    if (!record || typeof record !== 'object') throw new Error('NCBI dbSNP ha restituito un record JSON non valido.');
    if (record.merged_snapshot_data) {
      const newer = record.merged_snapshot_data?.merged_into ?? '?';
      throw new Error(`${rsid} risulta un rsID accorpato (${newer}): controlla il nuovo identificativo su dbSNP.`);
    }
    if (String(record.refsnp_id) !== id) throw new Error('dbSNP ha restituito un identificativo diverso da quello richiesto.');
    const placement = extractPlacement(record, position, accession);
    if (!placement.confirmed) throw new Error(`${rsid} non è confermato come SNP in chr${chrom}:${position} su GRCh38 (${accession}). Posizioni riportate: ${placement.positions.join(', ') || 'non disponibili'}. Verifica di aver aggiornato anche posizione e rsID, non solo il cromosoma.`);
    const start = position - flank;
    const end = position + flank;
    const params = new URLSearchParams({db:'nuccore', id:accession, seq_start:String(start), seq_stop:String(end), strand:'1', rettype:'fasta', retmode:'text'});
    const fasta = await fetchWithTimeout(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${params}`, {kind:'text',timeout:25000});
    if (!fasta.trimStart().startsWith('>')) throw new Error('EFetch non ha restituito un file FASTA.');
    const sequence = fasta.split(/\r?\n/).filter(s => s && !s.startsWith('>')).join('').trim().toUpperCase();
    if (sequence.length !== 1001 || !/^[ACGTN]+$/.test(sequence)) throw new Error(`EFetch ha restituito una sequenza inattesa (${sequence.length} basi).`);
    const refBase = sequence[position-start];
    if (refBase === 'N' || !placement.alleles.includes(refBase)) throw new Error(`Discrepanza: riferimento FASTA ${refBase}, alleli dbSNP ${placement.alleles.join('/')}.`);
    return apiResponse({ok:true, reference:{chrom, pos:position, rsid, build:'GRCh38', accession,
      start, end, sequence, alleles:placement.alleles, ref_base:refBase,
      verified:true, source:'NCBI dbSNP + EFetch (GRCh38)'}});
  } catch (err) {
    return apiResponse({ok:false, error:String(err?.message ?? err)}, 400);
  }
}
