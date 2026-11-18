# Radici di Calabria — portale genealogico statico

Prima versione funzionante di un portale web multi-comune progettato per raccogliere le pubblicazioni HTML generate da MacFamilyTree 11. Non è necessario alcun server applicativo: è un sito statico pronto per Netlify.

## Cosa contiene

- `index.html`: homepage, catalogo dei comuni con ricerca e filtri provinciali.
- `rete.html?comune=pedace`: cornice navigabile per il sito MacFamilyTree del singolo comune.
- `viewer.html`: piccolo esploratore GEDCOM client-side con file locale e dati di dimostrazione inventati. Non trasmette file a server; supporta i campi GEDCOM più comuni, ma **non** sostituisce il visualizzatore completo di MacFamilyTree.
- `data/comuni.js`: catalogo modificabile.
- `reti/cariati/`: esportazione reale di MacFamilyTree 11 integrata; `reti/<altro-comune>/` per le reti successive.

**Cariati (CS)** è collegata e consultabile. La sua esportazione MacFamilyTree è in `reti/cariati/`, con 30.566 persone, 9.783 famiglie e 29.517 eventi nel database. Il periodo 1720–1910 si riferisce alle date leggibili degli eventi, non alla certezza che tutti gli individui siano nati in quell'intervallo. I quattro comuni Pedace, Montegiordano, Luzzi e Petilia Policastro rimangono esempi da collegare.

## Collegare una rete MacFamilyTree

1. In MacFamilyTree 11 apri la genealogia relativa al comune.
2. Nella sezione **Pubblica / Publish** scegli **Esporta sito web / Export Website** e l'opzione di esportazione in una **cartella per un server web**. L'etichetta esatta può cambiare con la lingua/versione.
3. L'esportazione produce una pagina iniziale (`index.html`) e altri file o sottocartelle (script, dati, immagini, ecc.): **mantieni TUTTA la struttura**, non copiare solo il file HTML.
4. Copia **il contenuto** della cartella esportata dentro `reti/pedace/`, in modo che il file principale sia `reti/pedace/index.html` (non `reti/pedace/un-altra-cartella/index.html`).
5. Carica di nuovo il progetto su Netlify. Il portale riconoscerà automaticamente la rete consultabile.

Ripeti il procedimento per Montegiordano, Luzzi e gli altri comuni. Se la rete è già pubblicata su un sito esterno, in `data/comuni.js` valorizza `url` con l'indirizzo completo. Nota: **alcuni siti esterni impediscono la visualizzazione in iframe**; in quel caso usa il collegamento “Apri a tutto schermo” o lascia il sito al suo indirizzo originale.

## Aggiungere un comune

Apri `data/comuni.js`, aggiungi un nuovo oggetto:

```js
{
  slug: 'nuovo-comune',
  nome: 'Nuovo Comune',
  provincia: 'Cosenza',
  sigla: 'CS',
  descrizione: 'Una breve descrizione.',
  periodo: '',
  persone: null,
  url: '',
  cover: 'verde'
}
```

Crea la cartella `reti/nuovo-comune/`, inserisci i file HTML esportati con MacFamilyTree e ripubblica il progetto. Le scelte di `cover` sono `terra`, `blu`, `verde`, `ocra`.

## Avvio locale

Un semplice doppio clic su `index.html` mostra il portale e il viewer GEDCOM, ma **la verifica automatica della presenza delle reti HTML richiede un server HTTP**. Dal Terminale sul Mac:

```bash
cd radici-calabria
python3 -m http.server 8000
```

Apri quindi `http://localhost:8000`. Se ci sono esportazioni di reti in `reti/`, vengono riconosciute automaticamente.

## Pubblicare su Netlify

- **Metodo semplice:** trascina la cartella `radici-calabria` nella sezione di deploy manuale di Netlify. Il sito sarà indipendente dal tuo sito preesistente.
- **Metodo Git:** usa la cartella come repository e imposta la directory pubblicata su `.` (vedi `netlify.toml`).
- **Per aggiungere il portale al sito blogdown esistente** senza sostituire homepage o menu: copia la cartella in `static/genealogia/` del tuo progetto blogdown. Il portale sarà disponibile su `/genealogia/`, con esportazioni su `/genealogia/reti/pedace/`. Non pubblicare questo pacchetto come radice di un sito esistente: sovrascriveresti la homepage.

## Protezione della privacy

Prima di esportare, in MacFamilyTree 11 **escludi i viventi e i dati contrassegnati privati** quando non hai una base giuridica appropriata per la diffusione; controlla anche media, fotografie, note e fonti che possono includere informazioni su persone viventi. Una pagina HTML statica non è automaticamente privata. Se vuoi l'accesso riservato, usa un livello di autenticazione effettivo sul sito/host; non affidarti a un link nascosto o a una semplice password inserita in JavaScript.

## Limitazioni note

- La rete di Cariati è compresa. Le altre reti necessitano degli export MacFamilyTree.
- La ricerca nella homepage riguarda **i comuni**, non le persone dei diversi archivi. La ricerca all'interno di ciascuna rete è gestita da MacFamilyTree 11.
- Il viewer GEDCOM è opzionale e dimostrativo, non gestisce l'intero standard GEDCOM 7, tutte le immagini/fonti, né un grafo globale da 10.000 nodi simultaneamente.
- La visualizzazione incorporata di export HTML da altri domini può essere bloccata dalle relative impostazioni di sicurezza.


## Informazioni sull’integrazione di Cariati

- Il pacchetto originale MacFamilyTree 11 è stato copiato senza modificare dati genealogici e relazioni.
- Sono stati modificati soltanto il titolo del sito e il testo introduttivo, che nell’export erano segnaposto predefiniti.
- Per evitare di ridistribuire file di caratteri tipografici, i font incorporati nel tema sono stati sostituiti da caratteri di sistema.
- **Privacy**: prima di distribuire pubblicamente l’archivio, verificare dati senza data di nascita, note, fonti e altri contenuti riferibili a persone potenzialmente viventi.
- Testato con server web HTTP. Per visualizzare i dati MacFamilyTree serve un server HTTP (Netlify, localhost), non `file://`.
