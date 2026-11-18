#!/usr/bin/env python3
"""MacFamilyTree 11 website export -> Radici di Calabria JSON.

Usage:
    python3 tools/converti_mft.py Cariati.zip cariati "Cariati" \
        --out static/genealogia/data/cariati/rete.json

By default, apply a conservative historical birth/death filter. Use --include-all
explicitly to publish EVERY individual, family and event from the export.
The full dataset preserves every event and its original references.
The uploader is responsible for verifying publication rights and privacy.
"""
import argparse, gzip, json, re, sys, zipfile
from pathlib import Path

YEAR_RE = re.compile(r'(?<!\d)(1[5-9]\d{2}|20\d{2})(?!\d)')

def year_of(raw):
    match = YEAR_RE.search(raw or '')
    return int(match.group(1)) if match else None

def load_mft(archive: Path):
    if archive.is_dir():
        candidates = list(archive.rglob('FamilyTreeData.json.gz'))
        if len(candidates) != 1:
            raise ValueError(f'Atteso un solo FamilyTreeData.json.gz, trovati {len(candidates)}')
        raw = candidates[0].read_bytes()
    else:
        with zipfile.ZipFile(archive) as zf:
            candidates = [x for x in zf.namelist() if not x.startswith('__MACOSX/') and x.endswith('/resources/FamilyTreeData.json.gz')]
            if len(candidates) != 1:
                raise ValueError(f'Atteso un solo FamilyTreeData.json.gz, trovati {len(candidates)}')
            raw = zf.read(candidates[0])
    return json.loads(gzip.decompress(raw))

def make_dataset(source, slug, name, cutoff=1906, province="Cosenza", include_all=False):
    people = source['persons']; events = source['events']; fams = source['families']
    included = {}
    used_person_ids = set()
    for uid, p in people.items():
        refs = [events[e] for e in p.get('events', []) if e in events]
        births = [e for e in refs if e.get('conclusionTypeIdentifier') == '_PersonEvent_Birth']
        deaths = [e for e in refs if e.get('conclusionTypeIdentifier') == '_PersonEvent_Death']
        born = births[0].get('date', '') if births else ''
        died = deaths[0].get('date', '') if deaths else ''
        by = year_of(born)
        dy = year_of(died)
        # Historical death evidence, or birth at least 120 years ago.
        if not include_all and not deaths and (by is None or by > cutoff):
            continue
        person_id = p.get('gedcomID') or uid
        if person_id in used_person_ids:
            raise ValueError(f'Identificativo duplicato: {person_id}')
        used_person_ids.add(person_id)
        included[uid] = [person_id, (p.get('firstName') or '').strip(), (p.get('lastName') or '').strip(),
                         p.get('gender'), born, died, by, dy, [e for e in p.get('events', []) if e in events],
                         (p.get('nameSuffix') or '').strip()]

    people_by_id = sorted(included.values(), key=lambda v: ((v[2] or '').casefold(), (v[1] or '').casefold(), v[0]))
    families_out = []
    for uid, fam in fams.items():
        man = included.get(fam.get('man'))
        woman = included.get(fam.get('woman'))
        children = [included[c['child']][0] for c in fam.get('childRelations', []) if c.get('child') in included]
        # Only output family links among public people.
        if not include_all and not ((man or woman) and (children or (man and woman))):
            continue
        marriages = [events[ev] for ev in fam.get('events', []) if ev in events and events[ev].get('conclusionTypeIdentifier') == '_FamilyEvent_Marriage']
        marriage_date = marriages[0].get('date', '') if marriages else ''
        families_out.append([fam.get('gedcomID') or uid, man[0] if man else None, woman[0] if woman else None,
                             children, marriage_date, [e for e in fam.get('events',[]) if e in events]])
    families_out.sort(key=lambda f:f[0])
    included_event_ids = ({ev for p in included.values() for ev in p[8]} |
                          {ev for f in families_out for ev in f[5]})
    year_values = [year_of(e.get('date', '')) for e in events.values()]
    year_values = [y for y in year_values if y is not None]
    return {
        'schema': 'radici-calabria-v1', 'comune': name, 'provincia': province, 'slug': slug,
        'periodo': [min(year_values), max(year_values)] if year_values else [],
        'sorgente': 'Esportazione web MacFamilyTree 11',
        'cutoffNascita': None if include_all else cutoff,
        'archivioCompleto': include_all,
        'criterioPubblicazione': ('Archivio completo senza filtro cronologico.' if include_all else
                                 f'Evento di morte registrato oppure nascita nell’anno {cutoff} o precedente.'),
        'totaliOriginali': {'persone': len(people), 'famiglie': len(fams), 'eventi': len(events)},
        'totaliPubblici': {'persone': len(people_by_id), 'famiglie': len(families_out),
                           'eventi': len(events) if include_all else len(included_event_ids)},
        # Array compact to keep static hosting efficient.
        # Persone: [id, nome, cognome, sesso, nascita, morte, annoNascita, annoMorte, eventi[], suffisso]
        'persone': people_by_id,
        # Famiglie: [id, padre, madre, figli[], dataMatrimonio, eventi[]]
        'famiglie': families_out,
        # Eventi: [idEventoOriginale, tipo, data, etaAllEvento, timeInterval, objectUniqueID]
        'eventi': [[uid, e.get('conclusionTypeIdentifier'), e.get('date',''),
                    e.get('ageOfPersonAtEvent',''), e.get('timeInterval'), e.get('objectUniqueID')]
                   for uid,e in events.items() if include_all or uid in included_event_ids]
    }

def main():
    ap=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', type=Path)
    ap.add_argument('slug')
    ap.add_argument('comune')
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--birth-cutoff', type=int, default=1906)
    ap.add_argument('--include-all', action='store_true', help='Includi ogni individuo, famiglia ed evento (nessun filtro privacy automatico)')
    ap.add_argument('--provincia', default='Cosenza')
    args=ap.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', args.slug):ap.error('slug: usare solo a-z, 0-9 e trattini')
    raw=load_mft(args.input)
    out=make_dataset(raw,args.slug,args.comune,args.birth_cutoff,args.provincia,args.include_all)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print('Comune:',args.comune)
    print('Persone originali:',out['totaliOriginali']['persone'])
    print('Persone esportate:',out['totaliPubblici']['persone'])
    print('Famiglie esportate:',out['totaliPubblici']['famiglie'])
    print('Eventi esportati:',out['totaliPubblici']['eventi'])
    print('Creato:',args.out, f'({args.out.stat().st_size:,} bytes)')

if __name__=='__main__': main()
