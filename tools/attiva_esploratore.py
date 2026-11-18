#!/usr/bin/env python3
"""Attiva solo il nuovo collegamento Cariati nel portale esistente.
Non modifica lo stile grafico approvato, né rete.html o MacFamilyTree.
Avvio: python3 tools/attiva_esploratore.py (dalla radice blogdown).
"""
from pathlib import Path
from datetime import datetime
import sys

root = Path.cwd()
file = root / 'static' / 'genealogia' / 'assets' / 'home.js'
if not file.exists():
    print('ERRORE: home.js non trovato. Apri il Terminale nella cartella principale del progetto blogdown.', file=sys.stderr)
    sys.exit(1)

old = 'a.href = `rete.html?comune=${encodeURIComponent(town.slug)}`;'
new = "a.href = town.slug === 'cariati' ? 'esplora.html?comune=cariati' : `rete.html?comune=${encodeURIComponent(town.slug)}`;"
src = file.read_text(encoding='utf8')
if new in src:
    print('Collegamento a Cariati già attivo; nessuna modifica necessaria.')
elif old in src:
    backup = root / '.radici-backup'
    backup.mkdir(parents=True, exist_ok=True)
    backup_file = backup / f"home.js.{datetime.now():%Y%m%d-%H%M%S}.bak"
    backup_file.write_text(src, encoding='utf8')
    file.write_text(src.replace(old, new, 1),encoding='utf8')
    print('Link Cariati aggiornato nel portale, senza modificare la grafica.')
    print('Copia di sicurezza:',backup_file)
else:
    print('ATTENZIONE: home.js non ha il codice previsto; non ho modificato nulla.')
    print('Puoi comunque aprire /genealogia/esplora.html?comune=cariati direttamente.')
    print('Per collegare la scheda Cariati, apri static/genealogia/assets/home.js e cambia SOLO il suo href.')
    sys.exit(2)
