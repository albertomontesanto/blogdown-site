#!/usr/bin/env python3
"""Aggiunge alla homepage i contatori animati (in modo idempotente)."""
from datetime import datetime
from pathlib import Path
import re
import sys

page = Path('static/genealogia/index.html')
css = Path('static/genealogia/assets/contatori-animati.css')
js = Path('static/genealogia/assets/contatori-animati.js')


def main():
    if not page.is_file() or not css.is_file() or not js.is_file():
        sys.exit('ERRORE: apri la cartella blogdown ed estrai prima lo ZIP in questa posizione.')
    source = page.read_text(encoding='utf-8')
    if not re.search(r'</head>', source, flags=re.I):
        sys.exit('ERRORE: </head> non trovato in index.html. Nessuna modifica eseguita.')
    if 'id="summaryGrid"' not in source:
        sys.exit('ERRORE: il riepilogo dinamico non è presente nella homepage. Nessuna modifica eseguita.')
    updated = source
    links = [
        ('assets/contatori-animati.css', '  <link rel="stylesheet" href="assets/contatori-animati.css?v=20261119-2">'),
        ('assets/contatori-animati.js', '  <script defer src="assets/contatori-animati.js?v=20261119-2"></script>'),
    ]
    for marker, html in links:
        if marker not in updated:
            updated = re.sub(r'</head>', html+'\n</head>', updated, count=1, flags=re.I)
    if updated == source:
        print('Contatori animati già attivi; non è necessario modificare index.html.')
        return
    backup_root = Path('.git/radici-counter-backups') if Path('.git').is_dir() else Path('.backup-radici-counter')
    backup_dir = backup_root / datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir/'index.html').write_text(source, encoding='utf-8')
    page.write_text(updated, encoding='utf-8')
    print('Installazione completata. Modificato solo static/genealogia/index.html')
    print('Backup:', backup_dir/'index.html')

if __name__ == '__main__':
    main()
