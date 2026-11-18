#!/usr/bin/env python3
"""MacFamilyTree 11 website export -> public, minimal Radici di Calabria JSON.

Usage:
    python3 tools/converti_mft.py Cariati.zip cariati "Cariati" \
        --out static/genealogia/data/cariati/rete.json

Privacy-by-default: retain people with a death event or a documented birth year
<= cutoff (default 1906). Persons with no date are not emitted. This is a
conservative automated screen, NOT a substitute for a human privacy review.
Only names, dates, identifiers, and filtered family links are emitted;
notes, attachments, media, labels and the unfiltered archive are NOT emitted.
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

def make_dataset(source, slug, name, cutoff=1906, province="Cosenza"):
    people = source['persons']; events = source['events']; fams = source['families']
    safe = {}
    for uid, p in people.items():
        refs = [events[e] for e in p.get('events', []) if e in events]
        births = [e for e in refs if e.get('conclusionTypeIdentifier') == '_PersonEvent_Birth']
        deaths = [e for e in refs if e.get('conclusionTypeIdentifier') == '_PersonEvent_Death']
        born = births[0].get('date', '') if births else ''
        died = deaths[0].get('date', '') if deaths else ''
        by = year_of(born)
        dy = year_of(died)
        # Historical death evidence, or birth at least 120 years ago.
        if not deaths and (by is None or by > cutoff):
            continue
        person_id = p.get('gedcomID') or uid
        if person_id in safe:
            raise ValueError(f'Identificativo duplicato: {person_id}')
        safe[uid] = [person_id, (p.get('firstName') or '').strip(), (p.get('lastName') or '').strip(),
                     p.get('gender'), born, died, by, dy]

    people_by_id = sorted(safe.values(), key=lambda v: ((v[2] or '').casefold(), (v[1] or '').casefold(), v[0]))
    families_out = []
    for uid, fam in fams.items():
        man = safe.get(fam.get('man'))
        woman = safe.get(fam.get('woman'))
        children = [safe[c['child']][0] for c in fam.get('childRelations', []) if c.get('child') in safe]
        # Only output family links among public people.
        if not ((man or woman) and (children or (man and woman))):
            continue
        marriages = [events[ev] for ev in fam.get('events', []) if ev in events and events[ev].get('conclusionTypeIdentifier') == '_FamilyEvent_Marriage']
        marriage_date = marriages[0].get('date', '') if marriages else ''
        families_out.append([fam.get('gedcomID') or uid, man[0] if man else None, woman[0] if woman else None, children, marriage_date])
    families_out.sort(key=lambda f:f[0])
    year_values = [year_of(e.get('date', '')) for e in events.values()]
    year_values = [y for y in year_values if y is not None]
    return {
        'schema': 'radici-calabria-v1', 'comune': name, 'provincia': province, 'slug': slug,
        'periodo': [min(year_values), max(year_values)] if year_values else [],
        'sorgente': 'Esportazione web MacFamilyTree 11',
        'cutoffNascita': cutoff,
        'criterioPubblicazione': f'Evento di morte registrato oppure nascita nell’anno {cutoff} o precedente; verificare comunque la riservatezza.',
        'totaliOriginali': {'persone': len(people), 'famiglie': len(fams), 'eventi': len(events)},
        'totaliPubblici': {'persone': len(people_by_id), 'famiglie': len(families_out)},
        # Array compact to keep static hosting efficient.
        # Persone: [id, nome, cognome, sesso, nascita, morte, annoNascita, annoMorte]
        'persone': people_by_id,
        # Famiglie: [id, padre, madre, figli[], dataMatrimonio]
        'famiglie': families_out
    }

def main():
    ap=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input', type=Path)
    ap.add_argument('slug')
    ap.add_argument('comune')
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--birth-cutoff', type=int, default=1906)
    ap.add_argument('--provincia', default='Cosenza')
    args=ap.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', args.slug):ap.error('slug: usare solo a-z, 0-9 e trattini')
    raw=load_mft(args.input)
    out=make_dataset(raw,args.slug,args.comune,args.birth_cutoff,args.provincia)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print('Comune:',args.comune)
    print('Persone originali:',out['totaliOriginali']['persone'])
    print('Profili pubblici:',out['totaliPubblici']['persone'])
    print('Famiglie con relazioni pubbliche:',out['totaliPubblici']['famiglie'])
    print('Creato:',args.out, f'({args.out.stat().st_size:,} bytes)')

if __name__=='__main__': main()
