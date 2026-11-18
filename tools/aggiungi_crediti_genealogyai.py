#!/usr/bin/env python3
"""Aggiunge in modo non distruttivo il credito GenealogyAI® alla homepage genealogica.

Eseguire dalla radice del progetto Blogdown: python3 tools/aggiungi_crediti_genealogyai.py
"""
from pathlib import Path
from datetime import datetime
import re
import sys

TARGET = Path('static/genealogia/index.html')
CSS_LINK = '  <link rel="stylesheet" href="assets/genealogyai-credit.css?v=1">\n'
MARKER_MAIN = 'id="genealogyai-credit"'
MARKER_FOOT = 'class="genealogyai-footer-credit"'
MAIN_BLOCK = '''<aside class="genealogyai-credit" id="genealogyai-credit" aria-label="Tecnologia GenealogyAI">
  <div class="genealogyai-credit-label">LA TECNOLOGIA DIETRO LE RETI</div>
  <p>I portali genealogici di <em>Radici di Calabria</em> sono stati realizzati con <strong>GenealogyAI<sup>®</sup></strong>, tecnologia dedicata alla ricostruzione delle relazioni familiari a partire da documenti storici.</p>
  <span class="genealogyai-registered">GenealogyAI<sup>®</sup> è un marchio registrato.</span>
</aside>'''
FOOT_BLOCK = '<span class="genealogyai-footer-credit">Portali genealogici realizzati con <strong>GenealogyAI<sup>®</sup></strong></span>'


def main():
    if not TARGET.is_file():
        sys.exit(f'ERRORE: {TARGET} non trovato. Avvia lo script dalla cartella principale blogdown.')
    data = TARGET.read_text(encoding='utf-8')
    original = data
    if 'assets/genealogyai-credit.css' not in data:
        if '</head>' not in data:
            sys.exit('ERRORE: pagina HTML senza </head>; nessuna modifica eseguita.')
        data = data.replace('</head>', CSS_LINK + '</head>', 1)

    if MARKER_MAIN not in data:
        p0 = data.find('id="progetto"')
        p1 = data.find('</section>', p0)
        if p0 == -1 or p1 == -1:
            sys.exit('ERRORE: sezione #progetto non riconosciuta; nessuna modifica eseguita.')
        section = data[p0:p1]
        tags_match = re.search(r'<div\s+class="project-tags"[^>]*>.*?</div>', section, flags=re.DOTALL)
        if not tags_match:
            sys.exit('ERRORE: blocco .project-tags non riconosciuto; nessuna modifica eseguita.')
        insert_position = p0 + tags_match.end()
        data = data[:insert_position] + MAIN_BLOCK + data[insert_position:]

    if MARKER_FOOT not in data:
        footer = re.search(r'(<div class="container footer-bottom">)(.*?)(</div>\s*</footer>)', data, flags=re.DOTALL)
        if not footer:
            sys.exit('ERRORE: footer-bottom non riconosciuto; nessuna modifica eseguita.')
        data = data[:footer.start(3)] + FOOT_BLOCK + data[footer.start(3):]

    if data == original:
        print('Nessuna modifica necessaria: crediti GenealogyAI® già presenti.')
        return
    backup = TARGET.with_name('index.html.pre-genealogyai-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.bak')
    backup.write_text(original, encoding='utf-8')
    TARGET.write_text(data, encoding='utf-8')
    print('Aggiornato:', TARGET)
    print('Backup:', backup)
    print('Controlla il risultato e pubblica le modifiche con Git.')

if __name__ == '__main__':
    main()
