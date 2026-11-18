#!/usr/bin/env python3
"""Enable IT/EN on Radici di Calabria, preserving current HTML and scripts.

Run from the root of the existing blogdown Git checkout:
    python3 tools/attiva_bilingue.py

Only inserts references to the i18n CSS/JS. It never rewrites genealogy data.
"""
from datetime import datetime
from pathlib import Path
import re
import sys

ROOT = Path('static/genealogia')
PAGES = ('index.html', 'esplora.html', 'viewer.html', 'rete.html')
LINK = '<link rel="stylesheet" href="assets/i18n.css?v=1">'
SCRIPT = '<script defer src="assets/i18n.js?v=1"></script>'


def main():
    if not ROOT.is_dir():
        sys.exit('ERRORE: esegui dalla cartella principale del progetto blogdown.')
    for resource in ('assets/i18n.js', 'assets/i18n.css'):
        if not (ROOT / resource).is_file():
            sys.exit(f'ERRORE: file mancante: {ROOT / resource}. Estrai prima lo ZIP.')

    available = [ROOT / name for name in PAGES if (ROOT / name).is_file()]
    if not available:
        sys.exit('ERRORE: nessuna pagina HTML del portale trovata.')
    prepared = []
    for path in available:
        current = path.read_text(encoding='utf-8')
        if not re.search(r'</head>', current, re.I):
            sys.exit(f'ERRORE: tag </head> assente in {path}; nessuna modifica eseguita.')
        updated = current
        # Insert exactly once. Existing scripts are never removed or reordered.
        if 'assets/i18n.css' not in updated:
            updated = re.sub(r'</head>', '  ' + LINK + '\n</head>', updated, count=1, flags=re.I)
        if 'assets/i18n.js' not in updated:
            updated = re.sub(r'</head>', '  ' + SCRIPT + '\n</head>', updated, count=1, flags=re.I)
        if updated != current:
            prepared.append((path, current, updated))

    if not prepared:
        print('Versione bilingue già attiva. Nessuna modifica necessaria.')
        return

    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup_dir = Path('.git/radici-i18n-backups') if Path('.git').is_dir() else Path('.backup-radici-i18n')
    for path, current, updated in prepared:
        backup = backup_dir / stamp / path
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_text(current, encoding='utf-8')
        path.write_text(updated, encoding='utf-8')
        print(f'Aggiornato: {path} (backup: {backup})')
    print('Pronto: IT/EN attivo sulle pagine del portale e sugli esploratori.')
    print('Nessun GEDCOM o file JSON è stato modificato.')


if __name__ == '__main__':
    main()
