#!/usr/bin/env python3
"""Adatta catalogo e testi del portale al nuovo GEDCOM di Cariati.

Non sovrascrive home.js, esplora.js o esplora.html con versioni obsolete:
modifica soltanto righe specifiche, conservando le personalizzazioni locali.
Uso: python3 tools/applica_aggiornamento_cariati.py [--root .]
"""
from pathlib import Path
import argparse
import json
import re


def update_text_file(path, transform):
    if not path.exists():
        print(f'  Saltato (non trovato): {path}')
        return False
    original = path.read_text(encoding='utf8')
    updated = transform(original)
    if original != updated:
        path.write_text(updated, encoding='utf8')
        print(f'  Aggiornato: {path}')
        return True
    print(f'  Invariato: {path}')
    return False


def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--root',type=Path,default=Path('.'))
    args=a.parse_args()
    root=args.root.resolve()
    base=root/'static/genealogia'
    source=base/'data/cariati/rete.json'
    if not source.is_file():
        raise SystemExit(f'ERRORE: manca {source}. Estrai prima lo ZIP nella cartella blogdown.')
    d=json.loads(source.read_text(encoding='utf8'))
    if d.get('schema')!='radici-calabria-v1' or d.get('slug')!='cariati':
        raise SystemExit('ERRORE: formato/slug JSON non corrispondente a Cariati.')
    n=d['totaliOriginali']
    if (n.get('persone'),n.get('famiglie'),n.get('eventi')) != (len(d['persone']),len(d['famiglie']),len(d['eventi'])):
        raise SystemExit('ERRORE: conteggi incompleti nel JSON.')
    print(f"Nuovo GEDCOM: {n['persone']} persone, {n['famiglie']} famiglie, {n['eventi']} eventi.")
    period='–'.join(map(str,d.get('periodo') or []))
    catalog=base/'data/comuni.js'
    def edit_catalog(txt):
        pattern=re.compile(r"\{\s*slug:\s*['\"]cariati['\"].*?\n\s*\}",re.S)
        found=pattern.findall(txt)
        if len(found)!=1:
            raise SystemExit('ERRORE: non trovo una sola scheda Cariati in data/comuni.js; nessuna modifica al catalogo.')
        record=found[0]
        fields={'persone':str(n['persone']),'famiglie':str(n['famiglie']),'eventi':str(n['eventi']),'periodo':"'"+period+"'"}
        for key,value in fields.items():
            pat=re.compile(r'\b'+key+r'\s*:\s*(?:[\d_]+|\'[^\']*\'|"[^"]*")')
            if pat.search(record):record=pat.sub(key+': '+value,record,count=1)
            else:record=record[:-1].rstrip().rstrip(',')+', '+key+': '+value+'\n  }'
        return txt.replace(found[0],record,1)
    if not catalog.exists():
        raise SystemExit(f'ERRORE: non esiste {catalog}; non modifico il portale.')
    update_text_file(catalog, edit_catalog)

    def edit_explorer_js(txt):
        return txt.replace(
            'Questa versione include tutti i profili, tutte le famiglie e tutti gli eventi presenti nell’esportazione originale MacFamilyTree 11, anche quando le date non sono note.',
            'Questa versione include tutti i profili, tutte le famiglie e tutti gli eventi presenti nel GEDCOM aggiornato, anche quando le date non sono note.'
        )
    update_text_file(base/'assets/esplora.js',edit_explorer_js)

    def edit_html(txt):
        replacements={
            'Le informazioni effettivamente presenti nell\'esportazione di MacFamilyTree 11.': 'Eventi e legami familiari presenti nel GEDCOM aggiornato.',
            'Documenti e relazioni</h3>': 'Eventi e relazioni</h3>',
            'L\'esportazione usata in questa versione contiene identità, date e legami genealogici': 'Il GEDCOM aggiornato contiene identità, date e legami genealogici',
            'L\'archivio include tutti i profili dell\'esportazione MacFamilyTree;': 'L\'archivio include tutti i profili del GEDCOM aggiornato;',
            'Consulta il visualizzatore originale ↗': 'MacFamilyTree (archivio precedente) ↗',
            'Visualizzatore originale <span': 'MacFamilyTree precedente <span',
            '1720–1910': period,
        }
        for before,after in replacements.items():txt=txt.replace(before,after)
        return txt
    update_text_file(base/'esplora.html',edit_html)

    # Se il catalogo punta ancora al vecchio viewer, cambia solo il link a Cariati.
    def edit_home_js(txt):
        target='a.href = `rete.html?comune=${encodeURIComponent(town.slug)}`;'
        replacement="a.href = `${town.slug === 'cariati' ? 'esplora.html' : 'rete.html'}?comune=${encodeURIComponent(town.slug)}`;"
        return txt.replace(target,replacement)
    update_text_file(base/'assets/home.js',edit_home_js)
    print('Completato. Controlla git diff prima di creare il commit.')

if __name__=='__main__':main()
