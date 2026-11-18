#!/usr/bin/env python3
"""Attiva cinque archivi GEDCOM indipendenti sul portale Radici di Calabria.

Uso dalla directory principale blogdown:
  python3 tools/applica_nuovi_comuni.py

Richiede il portale gia' installato: aggiorna SOLO catalogo, collegamenti e
brevi testi, conservando i file CSS e il motore del grafo a clic esistenti.
Esegue controlli prima delle modifiche; crea backup locali degli originali.
"""
from __future__ import annotations
import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import shutil

ARCHIVI = [
    ('petilia-policastro', 'Petilia Policastro', 'Crotone', 'KR', 'ocra',
     'Rete genealogica storica di Petilia Policastro, con persone, nuclei familiari ed eventi.'),
    ('oriolo', 'Oriolo', 'Cosenza', 'CS', 'blu',
     'Persone, famiglie e legami di parentela della rete genealogica di Oriolo.'),
    ('san-lorenzo-del-vallo', 'San Lorenzo del Vallo', 'Cosenza', 'CS', 'verde',
     'Archivio genealogico di San Lorenzo del Vallo, consultabile per nomi e relazioni.'),
    ('montegiordano', 'Montegiordano', 'Cosenza', 'CS', 'blu',
     'Rete genealogica di Montegiordano con nuclei familiari e collegamenti tra generazioni.'),
    ('bocchigliero', 'Bocchigliero', 'Cosenza', 'CS', 'terra',
     'Persone, famiglie ed eventi presenti nell’archivio genealogico di Bocchigliero.'),
]


def js(value):
    return json.dumps(value, ensure_ascii=False)


def validate_data(base):
    result = {}
    for slug, nome, provincia, *_ in ARCHIVI:
        path = base / 'data' / slug / 'rete.json'
        if not path.is_file():
            raise RuntimeError(f'Manca {path}. Estrai prima lo ZIP dalla cartella blogdown.')
        data = json.loads(path.read_text(encoding='utf-8'))
        if data.get('schema') != 'radici-calabria-v1' or data.get('slug') != slug:
            raise RuntimeError(f'Schema/slug del file {path} non corrispondente.')
        if data.get('comune') != nome or data.get('provincia') != provincia:
            raise RuntimeError(f'Comune/provincia inattesi in {path}.')
        counts = data.get('totaliPubblici') or {}
        for key in ('persone', 'famiglie', 'eventi'):
            if counts.get(key) != len(data.get(key) or []):
                raise RuntimeError(f'Conteggio {key} non coerente in {path}.')
        result[slug] = data
    return result


def catalog_objects(text):
    """Individua gli oggetti JS semplici con `slug` senza riscrivere il catalogo."""
    rx = re.compile(r'\{[^{}]*?\bslug\s*:\s*[\'"]([^\'"]+)[\'"][^{}]*?\}', re.S)
    found = {}
    for match in rx.finditer(text):
        slug = match.group(1)
        if slug in found:
            raise RuntimeError(f'Slug duplicato in comuni.js: {slug}')
        found[slug] = match
    if not found:
        raise RuntimeError('Nessuna scheda riconosciuta in comuni.js; non modifico il file.')
    return found


def set_js_field(obj, field, value):
    pat = re.compile(r'(\b' + re.escape(field) + r'\s*:\s*)(?:true|false|null|\d+|\x27[^\x27]*\x27|"[^"]*")')
    if pat.search(obj):
        return pat.sub(lambda m: m.group(1) + value, obj, count=1)
    # Aggiungi senza modificare i campi e le descrizioni preesistenti.
    i = obj.rfind('}')
    prefix = obj[:i].rstrip()
    return prefix + ('' if prefix.endswith(',') else ',') + f'\n    {field}: {value}\n  ' + obj[i:]


def update_catalog(text, datasets):
    if not re.search(r'window\s*\.\s*RADICI_COMUNI\s*=\s*\[', text):
        raise RuntimeError('Non trovo window.RADICI_COMUNI = [ in comuni.js')
    text = text.replace('I file esportati da MacFamilyTree vanno in reti/<slug>/ (incluso index.html).',
                        'Gli archivi GEDCOM convertiti si trovano in data/<slug>/rete.json.')
    text = text.replace('In hosting, la pagina principale verifica automaticamente la presenza di index.html.',
                        'Le voci con archivioPersonalizzato=true aprono il visualizzatore GEDCOM.')
    original = catalog_objects(text)
    # Modifica in ordine inverso per conservare gli intervalli originali.
    meta_by_slug = {a[0]: a for a in ARCHIVI}
    for slug, match in sorted(original.items(), key=lambda x: x[1].start(), reverse=True):
        if slug not in meta_by_slug and slug != 'cariati':
            continue
        record = match.group(0)
        if slug == 'cariati':
            record = set_js_field(record, 'archivioPersonalizzato', 'true')
            cariati_path = Path(update_catalog.cariati_data_path) if hasattr(update_catalog, 'cariati_data_path') else None
            if cariati_path and cariati_path.is_file():
                cariati = json.loads(cariati_path.read_text(encoding='utf8'))
                if cariati.get('schema') == 'radici-calabria-v1' and cariati.get('slug') == 'cariati':
                    n = cariati['totaliPubblici']
                    for k in ('persone', 'famiglie', 'eventi'):
                        record = set_js_field(record, k, str(n[k]))
                    record = set_js_field(record, 'periodo', js('–'.join(str(y) for y in cariati.get('periodo', []))))
        else:
            _, nome, provincia, sigla, cover, description = meta_by_slug[slug]
            d = datasets[slug]
            fields = {
                'nome': js(nome), 'provincia': js(provincia), 'sigla': js(sigla),
                'descrizione': js(description),
                'persone': str(d['totaliPubblici']['persone']),
                'famiglie': str(d['totaliPubblici']['famiglie']),
                'eventi': str(d['totaliPubblici']['eventi']),
                'periodo': js('–'.join(str(y) for y in d.get('periodo', []))),
                'ready': 'true', 'archivioPersonalizzato': 'true',
                'url': js(''), 'cover': js(cover),
            }
            for k, v in fields.items():
                record = set_js_field(record, k, v)
        text = text[:match.start()] + record + text[match.end():]
    # I comuni aggiunti vengono inseriti subito dopo l'apertura della lista.
    missing = [x for x in ARCHIVI if x[0] not in original]
    if missing:
        new_records = []
        for slug, nome, provincia, sigla, cover, description in missing:
            d = datasets[slug]
            n = d['totaliPubblici']
            period = '–'.join(str(y) for y in d.get('periodo', []))
            new_records.append('  {\n'
                f'    slug: {js(slug)}, nome: {js(nome)}, provincia: {js(provincia)}, sigla: {js(sigla)},\n'
                f'    descrizione: {js(description)},\n'
                f'    periodo: {js(period)}, persone: {n["persone"]}, famiglie: {n["famiglie"]}, eventi: {n["eventi"]},\n'
                f'    url: "", ready: true, archivioPersonalizzato: true, cover: {js(cover)}\n'
                '  },\n')
        rx = re.compile(r'(window\s*\.\s*RADICI_COMUNI\s*=\s*\[)([ \t]*\r?\n)')
        text, count = rx.subn(lambda m: m.group(1) + m.group(2) + ''.join(new_records), text, count=1)
        if count != 1:
            raise RuntimeError('Non riesco ad aggiungere nuove voci al catalogo.')
    # Re-verifica che ci sia una sola voce per comune.
    final = catalog_objects(text)
    for slug in ['cariati'] + [a[0] for a in ARCHIVI]:
        if slug not in final: raise RuntimeError(f'Manca {slug} dal catalogo risultante.')
    return text


def update_home_js(text):
    pattern = re.compile(r'(?m)^(?P<pad>\s*)a\.href\s*=\s*.+;[ \t]*$')
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError('Non posso identificare con sicurezza il collegamento delle schede in home.js')
    # Mantiene url esterni e reti di altri comuni non ancora convertite.
    line = ("a.href = town.url || (town.archivioPersonalizzato "
            "? `esplora.html?comune=${encodeURIComponent(town.slug)}` "
            ": `rete.html?comune=${encodeURIComponent(town.slug)}`);")
    match = matches[0]
    return text[:match.start()] + match.group('pad') + line + text[match.end():]


def update_explorer_js(text):
    # La statistica viene letta dal JSON del comune aperto, senza hardcode.
    rx = re.compile(r"(?s)\$\('privacySummary'\)\.textContent=d\.archivioCompleto\?.*?;(?=\s*const legacy=)")
    replacement = ("$('privacySummary').textContent=d.archivioCompleto?\n"
      "      `Sono consultabili tutti i profili, le famiglie e gli eventi contenuti nell'archivio di ${d.comune}. Origine: ${d.sorgente || 'GEDCOM'}.`:\n"
      "      `Profili con morte registrata o nascita entro il ${d.cutoffNascita}. Alcuni profili e collegamenti non sono pubblicati.`;")
    text, count = rx.subn(lambda m: replacement, text, count=1)
    if count != 1:
        # Supporta re-installazione idempotente.
        if 'Origine: ${d.sorgente' not in text:
            raise RuntimeError('Impossibile aggiornare il testo del dataset in esplora.js')
    if 'const legacyAvailable' not in text:
        original = "$('legacyLink').href=legacy; $('originalBottom').href=legacy;"
        if original not in text:
            raise RuntimeError('Non trovo la riga del visualizzatore originale in esplora.js')
        text = text.replace(original, original + "\n    const legacyAvailable = slug === 'cariati';\n    $('legacyLink').style.display = legacyAvailable ? '' : 'none';\n    $('originalBottom').style.display = legacyAvailable ? '' : 'none';", 1)
    return text


def update_explorer_html(text):
    text = re.sub(r'(src="assets/esplora\.js)(?:\?v=[^"]+)?(")',
                  r'\g<1>?v=20261118-multicomuni\2', text, count=1)
    substitutions = {
        'Esplora nomi, famiglie e legami storici nell\'archivio genealogico digitale di Cariati.':
          'Esplora nomi, famiglie e legami storici negli archivi genealogici digitali dei comuni calabresi.',
        "Le informazioni effettivamente presenti nell'esportazione di MacFamilyTree 11.":
          'Date, eventi e relazioni disponibili nel GEDCOM di questo comune.',
        "L'esportazione usata in questa versione contiene identità, date e legami genealogici":
          'Il GEDCOM di questo comune contiene identità, date e legami genealogici',
        "L'archivio include tutti i profili dell'esportazione MacFamilyTree;":
          "L'archivio include i profili presenti nel GEDCOM del comune;",
        "L'archivio include tutti i profili del GEDCOM aggiornato;":
          "L'archivio include i profili presenti nel GEDCOM del comune;",
    }
    for old, new in substitutions.items(): text = text.replace(old, new)
    return text


def update_home_html(text):
    text = re.sub(r'(src="assets/home\.js)(?:\?v=[^"]+)?(")',
                  r'\g<1>?v=20261118-multicomuni\2', text, count=1)
    text = re.sub(r'(src="data/comuni\.js)(?:\?v=[^"]+)?(")',
                  r'\g<1>?v=20261118-multicomuni\2', text, count=1)
    old = 'La rete di Cariati è già consultabile. Le altre genealogie verranno progressivamente aggiunte con i file web esportati da MacFamilyTree.'
    new = 'Sono consultabili Cariati, Petilia Policastro, Oriolo, San Lorenzo del Vallo, Montegiordano e Bocchigliero. Gli altri archivi verranno aggiunti progressivamente.'
    text = text.replace(old, new)
    old = 'MacFamilyTree 11 produce le pagine web navigabili relative a ciascuna rete.'
    new = 'I file GEDCOM vengono convertiti in reti navigabili con il visualizzatore genealogico personalizzato.'
    text = text.replace(old, new)
    return text


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='.', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    base = root / 'static/genealogia'
    datasets = validate_data(base)
    paths = {
        'catalogo': base / 'data/comuni.js',
        'collegamenti': base / 'assets/home.js',
        'esploratore': base / 'assets/esplora.js',
        'pagina_esploratore': base / 'esplora.html',
        'homepage': base / 'index.html',
    }
    for label, path in paths.items():
        if not path.is_file():
            raise SystemExit(f'ERRORE: non trovo {path} ({label}). Installare prima la versione attuale del portale.')
    orig = {k: p.read_text(encoding='utf8') for k, p in paths.items()}
    update_catalog.cariati_data_path = base / 'data/cariati/rete.json'
    # Calcola TUTTE le modifiche in memoria prima di toccare i file.
    try:
        updated = {
            'catalogo': update_catalog(orig['catalogo'], datasets),
            'collegamenti': update_home_js(orig['collegamenti']),
            'esploratore': update_explorer_js(orig['esploratore']),
            'pagina_esploratore': update_explorer_html(orig['pagina_esploratore']),
            'homepage': update_home_html(orig['homepage']),
        }
    except RuntimeError as error:
        raise SystemExit(f'ERRORE: {error}. Nessun file modificato.')
    changed = [k for k in paths if orig[k] != updated[k]]
    if not changed:
        print('Tutti i cinque archivi sono già attivi. Nessuna modifica necessaria.')
        return
    backup = root / '.backup-radici-comuni' / datetime.now().strftime('%Y%m%d-%H%M%S')
    for k in changed:
        dest = backup / paths[k].relative_to(root)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(paths[k], dest)
    print(f'Backup di sicurezza: {backup}')
    for k in changed:
        paths[k].write_text(updated[k], encoding='utf8')
        print(f'Aggiornato: {paths[k].relative_to(root)}')
    print('\nReti pronte nel catalogo:')
    for slug, nome, *_ in ARCHIVI:
        n = datasets[slug]['totaliPubblici']
        print(f'  {nome}: {n["persone"]:,} persone, {n["famiglie"]:,} famiglie')
    print('\nControlla git diff, poi pubblica il commit. Nessuna operazione remota eseguita.')

if __name__ == '__main__':
    main()
