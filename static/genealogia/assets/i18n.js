/* Radici di Calabria — English/Italian interface, v1.0.
   No genealogy records are modified or translated. Names remain verbatim.
   Works with existing page scripts and dynamically rendered views. */
(() => {
  'use strict';
  const STORAGE_KEY = 'radici-calabria-language';
  const IT_EN = {
    // Page descriptions (including SEO metadata)
    'Radici di Calabria. Esplora le reti genealogiche dei comuni calabresi e scopri storie, famiglie e legami attraverso le generazioni.':
      'Radici di Calabria. Explore Calabrian genealogy networks, family histories, and connections across generations.',
    'Esplora nomi, famiglie e legami storici negli archivi genealogici digitali dei comuni calabresi.':
      'Explore people, families, and historical connections in Calabria’s digital genealogy archives.',
    'Esplora un file GEDCOM direttamente nel browser. Naviga tra genitori, coniugi e figli senza caricare i dati su un server.':
      'Explore a GEDCOM file directly in your browser. Navigate parents, spouses, and children without uploading any records.',
    // Shared navigation
    'Radici di Calabria — Archivio genealogico digitale': 'Radici di Calabria — Digital Genealogy Archive',
    'Archivio genealogico digitale': 'Digital Genealogy Archive',
    'Archivio genealogico digitale · Calabria': 'Digital Genealogy Archive · Calabria',
    'Le genealogie': 'Genealogies',
    'Il progetto': 'About the project',
    'Come funziona': 'How it works',
    'Esplora un GEDCOM': 'Explore a GEDCOM',
    'Tutti i comuni': 'All municipalities',
    'Torna ai comuni ↗': 'Back to municipalities ↗',
    'Torna ai comuni': 'Back to municipalities',
    'Il portale': 'The portal',
    'Archivio': 'Archive',
    'Esplora': 'Explore',
    'Esploratore GEDCOM': 'GEDCOM Explorer',
    'Informazioni': 'Information',
    'Lingua del sito': 'Website language',
    'Apri il menu': 'Open menu',

    // Homepage, introduction, editorial sections
    'STORIE DI FAMIGLIA, MEMORIA DEL TERRITORIO': 'FAMILY STORIES, LOCAL MEMORY',
    'CALABRIA · ITALIA': 'CALABRIA · ITALY',
    'UN ARCHIVIO DI STORIE DA ESPLORARE': 'A COLLECTION OF STORIES TO EXPLORE',
    'Ogni famiglia': 'Every family',
    'ha una': 'has a',
    'storia.': 'story.',
    'Ogni storia ha': 'Every story has',
    'le sue': 'its',
    'radici.': 'roots.',
    'Un luogo digitale per scoprire le reti genealogiche dei comuni calabresi, esplorare i legami tra generazioni e custodire la memoria delle nostre comunità.':
      'A digital space to discover the genealogy networks of Calabrian towns, explore connections across generations, and preserve the memories of local communities.',
    'Esplora i comuni': 'Explore municipalities',
    'Scopri il progetto': 'Discover the project',
    'Dati genealogici organizzati per località, consultabili online.': 'Genealogical data organized by municipality and available online.',
    'TRACCE DI APPARTENENZA': 'TRACES OF BELONGING',
    'FIG. 01 — LE GENERAZIONI': 'FIG. 01 — GENERATIONS',
    'Antenati': 'Ancestors',
    'Ramo A': 'Branch A',
    'Ramo B': 'Branch B',
    'Una storia': 'One story',
    'DI FAMIGLIA': 'OF A FAMILY',
    'Ieri': 'Yesterday',
    'Oggi': 'Today',
    'Domani': 'Tomorrow',
    'UNA RETE DI PERSONE, LUOGHI E LEGAMI': 'A NETWORK OF PEOPLE, PLACES, AND CONNECTIONS',
    'Un territorio.': 'One region.',
    'Molte comunità.': 'Many communities.',
    'Molte generazioni.': 'Many generations.',
    'Infiniti legami.': 'Endless connections.',
    'Un solo luogo.': 'One shared place.',
    'Per ritrovarli.': 'To rediscover them.',

    // Dynamic summary and catalog
    '01 / RIEPILOGO DINAMICO': '01 / LIVE OVERVIEW',
    'La genealogia calabrese': 'Calabrian genealogy',
    'in numeri.': 'in numbers.',
    'Il riepilogo si aggiorna automaticamente in base ai comuni attualmente visibili nel catalogo.':
      'This overview updates automatically based on the municipalities currently visible in the catalog.',
    'Il riepilogo mostra i totali complessivi degli archivi presenti nel portale e si aggiorna automaticamente quando usi ricerca o filtri.':
      'These totals reflect the archives available in the portal and update automatically when you search or filter.',
    'Individui totali': 'Total individuals',
    'Famiglie totali': 'Total families',
    'Eventi documentati': 'Recorded events',
    'Portali consultabili': 'Available archives',
    'Province coinvolte': 'Provinces represented',
    'Periodo documentato': 'Documented period',
    '01 / L’ARCHIVIO': '01 / THE ARCHIVE',
    'Esplora le genealogie': 'Explore genealogies',
    'per comune.': 'by municipality.',
    'Seleziona una località per accedere alla sua rete genealogica. Ogni archivio è indipendente e può essere aggiornato nel tempo.':
      'Select a municipality to explore its genealogical network. Each archive is independent and may be updated over time.',
    'La disponibilità delle reti è verificata online': 'Archive availability is checked online',
    'Attiva JavaScript per visualizzare il catalogo dei comuni.': 'Enable JavaScript to view the municipality catalog.',
    'Nessuna località trovata': 'No municipalities found',
    'Prova con un altro nome o seleziona tutte le province.': 'Try another name or select all provinces.',
    'Un archivio in crescita.': 'An expanding archive.',
    'Sono consultabili Cariati, Petilia Policastro, Oriolo, San Lorenzo del Vallo, Montegiordano e Bocchigliero. Gli altri archivi verranno aggiunti progressivamente.':
      'Cariati, Petilia Policastro, Oriolo, San Lorenzo del Vallo, Montegiordano, and Bocchigliero are currently available. Further archives will be added over time.',
    'Come si aggiorna →': 'How it is updated →',
    'Tutte': 'All',
    'ARCHIVIO GENEALOGICO': 'GENEALOGY ARCHIVE',
    'COLLEZIONE COMUNALE': 'MUNICIPAL COLLECTION',
    'Consultabile': 'Available',
    'In preparazione': 'Coming soon',
    'Esplora la genealogia': 'Explore the genealogy',
    'Scopri la rete': 'View the archive',
    'Persone': 'People',
    'Famiglie': 'Families',
    'Eventi': 'Events',
    'Periodo': 'Period',
    'Dati e relazioni familiari saranno consultabili dopo la pubblicazione dell’archivio.':
      'Genealogical records and family connections will be available when this archive is published.',
    "Dati e relazioni familiari saranno consultabili dopo la pubblicazione dell'archivio.":
      'Genealogical records and family connections will be available when this archive is published.',

    // Individual town card descriptions — place names stay unchanged
    'La memoria genealogica di Cariati: persone, famiglie e relazioni tra generazioni.':
      'The genealogical history of Cariati: people, families, and intergenerational connections.',
    'Persone, famiglie e legami di parentela della rete genealogica di Oriolo.':
      'People, families, and kinship ties in the Oriolo genealogical network.',
    'Archivio genealogico di San Lorenzo del Vallo, consultabile per nomi e relazioni.':
      'Genealogy archive of San Lorenzo del Vallo, searchable by names and relationships.',
    'Persone, famiglie ed eventi presenti nell’archivio genealogico di Bocchigliero.':
      'People, families, and recorded events in the Bocchigliero genealogy archive.',
    'Rete genealogica di Montegiordano con nuclei familiari e collegamenti tra generazioni.':
      'Montegiordano genealogy network with family units and intergenerational connections.',
    'Rete genealogica storica di Petilia Policastro, con persone, nuclei familiari ed eventi.':
      'Historical genealogy network of Petilia Policastro, with people, families, and events.',
    'Archivio genealogico in preparazione. La rete sarà disponibile prossimamente.':
      'Genealogy archive under preparation. The network will be available soon.',
    'Famiglie, matrimoni e discendenze ricostruiti attraverso fonti storiche.':
      'Families, marriages, and descendants reconstructed from historical records.',
    'Un percorso tra nuclei familiari, generazioni e documenti d’archivio.':
      'Discover family units, generations, and historical records.',

    // Project and how it works
    'MEMORIA / IDENTITÀ / TERRITORIO': 'MEMORY / IDENTITY / PLACE',
    'LE RADICI CI CONNETTONO': 'OUR ROOTS CONNECT US',
    '02 / IL PROGETTO': '02 / THE PROJECT',
    'La memoria non è': 'Memory is not',
    'soltanto passato.': 'only the past.',
    'È una connessione.': 'It is a connection.',
    'Radici di Calabria nasce per raccogliere in un unico spazio digitale le genealogie ricostruite attraverso documenti storici, conservando il legame fra persone, famiglie e luoghi.':
      'Radici di Calabria brings genealogies reconstructed from historical records into a single digital space, preserving the connections among people, families, and places.',
    'Il portale organizza le reti per comune e valorizza la consultazione delle singole genealogie, mantenendo separati i diversi archivi.':
      'The portal organizes genealogical networks by municipality, making each genealogy accessible while keeping the archives independent.',
    'Storia delle famiglie': 'Family history',
    'Fonti d’archivio': 'Archival sources',
    'Patrimonio culturale': 'Cultural heritage',
    '03 / COME FUNZIONA': '03 / HOW IT WORKS',
    'Dal documento': 'From records',
    'alla rete.': 'to networks.',
    'Un percorso semplice per passare dagli archivi genealogici alla consultazione online, senza cambiare gli strumenti di ricerca.':
      'A simple process for making reconstructed genealogies accessible online without changing research workflows.',
    'Ricostruzione': 'Reconstruction',
    'Le relazioni familiari vengono organizzate e verificate nel software genealogico.':
      'Family relationships are assembled and checked using genealogical software.',
    'Esportazione': 'Export',
    'I file GEDCOM vengono convertiti in reti navigabili con il visualizzatore genealogico personalizzato.':
      'GEDCOM files are converted into navigable networks using a custom genealogy viewer.',
    'Consultazione': 'Exploration',
    'Il portale collega le genealogie comunali e ne permette l’accesso da desktop e smartphone.':
      'The portal links municipal genealogies and provides access from desktop and mobile devices.',
    'STRUMENTO DI CONSULTAZIONE': 'EXPLORATION TOOL',
    'Hai un file GEDCOM?': 'Have a GEDCOM file?',
    'Esplora le relazioni tra genitori, figli e coniugi direttamente nel tuo browser. Il file rimane sul tuo dispositivo.':
      'Explore connections among parents, children, and spouses directly in your browser. Your file stays on your device.',
    'Apri esploratore GEDCOM ↗': 'Open GEDCOM Explorer ↗',
    'Storie di famiglia. Memorie condivise.': 'Family stories. Shared memories.',
    'Un patrimonio che attraversa le generazioni.': 'A legacy across generations.',
    'Radici di Calabria': 'Radici di Calabria',
    'Realizzato per custodire la memoria delle comunità calabresi.': 'Created to preserve the memory of Calabrian communities.',

    // GenealogyAI® credit (superscript ® remains untouched)
    'LA TECNOLOGIA DIETRO LE RETI': 'THE TECHNOLOGY BEHIND THE NETWORKS',
    'I portali genealogici di': 'The genealogy portals of',
    'sono stati realizzati con': 'were created using',
    ', tecnologia dedicata alla ricostruzione delle relazioni familiari a partire da documenti storici.':
      ', a technology designed to reconstruct family relationships from historical documents.',
    'è un marchio registrato.': 'is a registered trademark.',
    'Portali genealogici realizzati con': 'Genealogy portals created with',

    // Explorer headings, controls, and instructions
    'Esplora la rete | Radici di Calabria': 'Explore the network | Radici di Calabria',
    'Vai ai contenuti': 'Skip to content',
    'Visualizzatore originale': 'Original viewer',
    "Caricamento dell'archivio genealogico…": 'Loading genealogy archive…',
    'RETE GENEALOGICA · CALABRIA': 'GENEALOGICAL NETWORK · CALABRIA',
    "Un archivio da esplorare per nome, famiglia e generazione. Ogni collegamento proviene dalle relazioni presenti nell'esportazione genealogica originale.":
      'Explore this archive by name, family, and generation. Each connection comes from the relationships recorded in the original genealogical export.',
    'CONSULTAZIONE': 'EXPLORATION',
    'Persone, famiglie, relazioni.': 'People, families, relationships.',
    "Ricerca una persona e segui i legami documentati, passando da una generazione all'altra.":
      'Search for a person and follow recorded relationships across generations.',
    'Persone nell’archivio': 'People in the archive',
    'Famiglie nell’archivio': 'Families in the archive',
    'Eventi registrati': 'Recorded events',
    '01 / CONSULTAZIONE': '01 / EXPLORE',
    'Cerca una persona': 'Find a person',
    'Puoi cercare per nome, cognome o identificativo GEDCOM.': 'Search by given name, surname, or GEDCOM identifier.',
    'NOME O COGNOME': 'NAME OR SURNAME',
    'PERIODO DI NASCITA': 'BIRTH PERIOD',
    'Tutti i periodi': 'All periods',
    'Prima del 1800': 'Before 1800',
    'Dal 2000': 'Since 2000',
    'Senza nascita datata': 'No recorded birth date',
    'SESSO': 'SEX',
    'Tutti': 'All',
    'Uomini': 'Men',
    'Donne': 'Women',
    'COGNOMI FREQUENTI': 'COMMON SURNAMES',
    'Azzera filtri': 'Clear filters',
    'Mostra altri risultati': 'Show more results',
    '02 / ESPLORA LA RETE': '02 / EXPLORE THE NETWORK',
    'Le storie iniziano': 'Stories begin',
    'da un': 'with a',
    'nome.': 'name.',
    "Seleziona una persona dalla ricerca per visualizzare l'albero genealogico, le relazioni familiari e i collegamenti tra generazioni.":
      'Select a person from the search results to view their family tree, relationships, and links across generations.',
    'Cerca': 'Search',
    'Trova una persona tramite nome o cognome.': 'Find a person by given name or surname.',
    'Seleziona genitori, coniugi e discendenti.': 'Navigate among parents, spouses, and descendants.',
    'Collega': 'Connect',
    'Verifica i percorsi presenti nella rete.': 'Trace paths through the network.',
    'Archivio genealogico completo': 'Complete genealogy archive',
    "Sono consultabili tutti i profili presenti nell'esportazione genealogica di Cariati, compresi quelli senza data di nascita o morte.":
      'All profiles in the Cariati genealogy export are available, including those without a recorded birth or death date.',
    '02 / SCHEDA PERSONA': '02 / PERSON PROFILE',
    "← Torna all'esplorazione": '← Back to exploring',
    'SCHEDA BIOGRAFICA': 'BIOGRAPHICAL RECORD',
    'Copia link': 'Copy link',
    'Albero genealogico': 'Family tree',
    'Relazioni e date': 'Relationships and dates',
    'Trova collegamento': 'Find a connection',
    'Visualizzazione': 'Visualization',
    'Albero familiare': 'Family tree',
    'Fino a due generazioni prima e dopo la persona selezionata. Clicca su un nodo per proseguire.':
      'Up to two generations before and after the selected person. Select a node to keep exploring.',
    'Centra la vista': 'Center view',
    'Relazione genitore–figlio': 'Parent–child relationship',
    'Unione familiare': 'Family union',
    'Documenti e relazioni': 'Records and relationships',
    'Date, eventi e relazioni disponibili nel GEDCOM di questo comune.':
      'Dates, events, and relationships available in this municipality’s GEDCOM.',
    'Trova un collegamento': 'Find a connection',
    "Parti da questa persona, cerca un'altra persona e verifica se esiste un percorso documentato nella rete genealogica.":
      'Start from this person, search for another, and check whether a recorded path connects them.',
    'SECONDA PERSONA': 'SECOND PERSON',
    'Grafo genealogico a clic': 'Click-to-expand genealogy graph',
    'Parti da una sola persona: clicca sul quadrato (maschio) o sul cerchio (femmina) per mostrare tutte le relazioni dirette note. Clicca sugli altri nodi per sviluppare progressivamente la rete; un secondo clic richiude il ramo.':
      'Start with one person: click the square (male) or circle (female) to reveal all known direct relationships. Click other nodes to expand the network; click an expanded node again to collapse its branch.',
    'Scarica SVG': 'Download SVG',
    'Seleziona una persona per iniziare.': 'Select a person to begin.',
    'Ricomincia': 'Start over',
    'Adatta': 'Fit to view',
    'Centra persona': 'Center person',
    'Clicca sulla persona di partenza per aprire le sue relazioni.':
      'Click the starting person to reveal their relationships.',
    'Profilo di partenza': 'Starting profile',
    'Apri scheda persona ↗': 'Open person profile ↗',
    'Clic sul nodo: espandi/richiudi · Trascina: sposta · Rotellina: zoom':
      'Click node: expand/collapse · Drag: move · Scroll: zoom',
    'Maschio': 'Male',
    'Femmina': 'Female',
    'Genitori e figli': 'Parents and children',
    'Coniugi': 'Spouses',
    'Fratelli e sorelle': 'Siblings',
    'Nota sulle fonti.': 'Note on sources.',
    'Il GEDCOM di questo comune contiene identità, date e legami genealogici, ma non include riferimenti puntuali agli atti storici in ogni scheda. Le relazioni mostrate devono essere interpretate come dati ricostruiti, non come verifica documentale indipendente.':
      'This municipality’s GEDCOM contains identities, dates, and genealogical links, but not every profile includes a reference to the underlying historical record. The relationships shown are reconstructed data, not independently verified historical evidence.',
    "L'archivio include i profili presenti nel GEDCOM del comune; la pubblicazione dei dati richiede un'autorizzazione adeguata.":
      'This archive contains the profiles in the municipality’s GEDCOM; publication requires appropriate authorization.',
    'Consulta il visualizzatore originale ↗': 'Open the original viewer ↗',

    // Dynamic explorer terms
    'Non registrata': 'Not recorded',
    'Data non registrata': 'Date not recorded',
    'Senza nome': 'Unnamed person',
    'PERSONA · UOMO': 'PERSON · MAN',
    'PERSONA · DONNA': 'PERSON · WOMAN',
    'SCHEDA INDIVIDUALE': 'PERSON RECORD',
    'NONNI': 'GRANDPARENTS',
    'GENITORI': 'PARENTS',
    'PERSONA E CONIUGI': 'PERSON AND SPOUSES',
    'FIGLI': 'CHILDREN',
    'NIPOTI': 'GRANDCHILDREN',
    'Nessun legame disponibile': 'No relationships recorded',
    'Nessuna relazione disponibile nell’archivio.': 'No relationships recorded in this archive.',
    'NASCITA': 'BIRTH',
    'MORTE': 'DEATH',
    'IDENTIFICATIVO GEDCOM': 'GEDCOM IDENTIFIER',
    'Nascita': 'Birth',
    'Morte': 'Death',
    'Matrimonio': 'Marriage',
    'Evento': 'Event',
    'Eventi documentati': 'Recorded events',
    'Genitori': 'Parents',
    'Figli': 'Children',
    'Unioni e discendenza': 'Unions and descendants',
    'Coniuge non indicato': 'Spouse not recorded',
    'Nessun altro profilo collegato': 'No other linked profiles',
    'Nessuna persona trovata.': 'No person found.',
    'Cerca una seconda persona: verrà ricostruito il percorso minimo attraverso genitori, figli e unioni familiari presenti nell’archivio.':
      'Search for a second person to find the shortest path through recorded parents, children, and family unions.',
    'La persona coincide con quella selezionata.': 'This is the selected person.',
    'genitore': 'parent',
    'figlio/a': 'child',
    'coniuge': 'spouse',
    'nodo espanso': 'expanded node',
    'nodi espansi': 'expanded nodes',
    'collegamenti': 'connections',
    'relazioni dirette': 'direct relationships',
    'Clicca di nuovo sul nodo per richiuderlo': 'Click the node again to collapse it',
    'Clicca sul nodo per espanderlo': 'Click the node to expand it',
    'Richiudi': 'Collapse',
    'Espandi': 'Expand',
    'Relazione genitore–figlio': 'Parent–child relationship',
    'Fratelli o sorelle': 'Siblings',
    'sesso non indicato': 'sex not recorded',
    'maschio': 'male',
    'femmina': 'female',
    'Link copiato ✓': 'Link copied ✓',
    'Copia dalla barra indirizzi': 'Copy from the address bar',
    'Archivio non disponibile': 'Archive unavailable',
    'Codice del comune non valido.': 'Invalid municipality code.',
    'Formato dati non riconosciuto.': 'Unrecognized data format.',
    'Torna al catalogo dei comuni': 'Back to the municipality catalog',
    'Apri il progetto tramite un server web locale o Netlify, non come file locale.':
      'Open this project through a local web server or Netlify, rather than as a local file.',

    // GEDCOM uploader / original-viewer wrapper
    'Esploratore GEDCOM — Radici di Calabria': 'GEDCOM Explorer — Radici di Calabria',
    'Esplora genealogia — Radici di Calabria': 'Explore Genealogy — Radici di Calabria',
    'Rete genealogica': 'Genealogy network',
    'Esplora la storia delle famiglie.': 'Explore family history.',
    'Verifica archivio…': 'Checking archive…',
    'Archivio in preparazione': 'Archive coming soon',
    'Archivio consultabile': 'Archive available',
    'Località non trovata': 'Municipality not found',
    'Apri a tutto schermo ↗': 'Open full screen ↗',
    'Questa rete è pronta': 'This archive is ready',
    'per essere collegata.': 'to be connected.',
    'La sezione dedicata a questo comune è già predisposta. Per renderla navigabile bisogna aggiungere i file web esportati da MacFamilyTree 11.':
      'A page has been prepared for this municipality. Add the web files exported by MacFamilyTree 11 to enable navigation.',
    'Sito genealogico esportato da MacFamilyTree': 'Genealogy site exported from MacFamilyTree',
    'Le persone': 'People',
    'Seleziona una persona per navigare le relazioni genealogiche, oppure apri un file GEDCOM dal tuo computer.':
      'Choose a person to explore family relationships, or open a GEDCOM file from your computer.',
    '✳  Apri file GEDCOM (.ged)': '✳  Open GEDCOM file (.ged)',
    'I GEDCOM aperti qui sono elaborati solo nel browser: non vengono inviati al portale. La rete dimostrativa contiene esclusivamente dati inventati.':
      'GEDCOM files opened here are processed only in your browser; they are not uploaded. The demonstration network contains fictional data only.',
    'NAVIGAZIONE DELLE RELAZIONI': 'EXPLORE RELATIONSHIPS',
    'Esplora le generazioni': 'Explore generations',
    'Seleziona una persona e segui i legami familiari.': 'Choose a person and follow family connections.',
    'Rete dimostrativa': 'Demo network',
    '✳ Rete dimostrativa con nomi e dati fittizi. Usa “Apri file GEDCOM” per esplorare i tuoi dati reali.':
      '✳ Demo network with fictional names and records. Use “Open GEDCOM file” to explore your own data.',
    '← Indietro': '← Back',
    'Rete demo': 'Demo network',
    'Ripristina i dati della dimostrazione': 'Restore demo records',
    "La rappresentazione è centrata sulla persona selezionata; non visualizza l'intera rete simultaneamente, così rimane utilizzabile anche con archivi molto grandi.":
      'The view focuses on the selected person rather than showing the entire network at once, so it works with large archives.',
    'Seleziona una persona': 'Select a person',
    'Apri un GEDCOM o scegli una persona dall’elenco.': 'Open a GEDCOM or choose a person from the list.',
    'Generazione precedente · Genitori': 'Previous generation · Parents',
    'Persona selezionata': 'Selected person',
    '· e coniugi': '· and spouses',
    'Generazione successiva · Figli': 'Next generation · Children',
    'Genitori non presenti nel file': 'Parents not found in the file',
    'Nessun figlio registrato': 'No children recorded',
    'Profilo anagrafico': 'Biographical profile',
    'Nome': 'Name',
    'Sesso': 'Sex',
    'Maschile': 'Male',
    'Femminile': 'Female',
    'Non indicato': 'Not specified',
    'Luogo di nascita': 'Place of birth',
    'Decesso': 'Death',
    'Professione': 'Occupation',
    'Legami familiari': 'Family relationships',
    'Genitori registrati': 'Recorded parents',
    'Coniugi registrati': 'Recorded spouses',
    'Figli registrati': 'Recorded children',
    'Famiglie collegate': 'Linked families',
    'Date non disponibili': 'Dates unavailable',
    'Persona non identificata': 'Unidentified person',
    'Data non indicata': 'Date not supplied',
    'Non sono stati trovati individui GEDCOM. Verifica che il file abbia il formato corretto.':
      'No GEDCOM individuals found. Check that your file uses a supported format.',
    'Il file supera i 35 MB. Per archivi molto grandi consigliamo le pagine web esportate da MacFamilyTree.':
      'This file exceeds 35 MB. For very large archives, use an exported web archive.',
    'Impossibile aprire il file.': 'Unable to open file.'
  };

  // Dynamic text created by the existing portal and genealogy scripts.
  const DYNAMIC = [
    [/^Provincia di (.+)$/u, (_, town) => `Province of ${town}`],
    [/^Provincia di (.+)$/iu, (_, town) => `Province of ${town}`],
    [/^Intervallo storico dei dati di (.+)$/u, (_, town) => `Date range covered by ${town}`],
    [/^SCHEDA (\d+)$/u, (_, n) => `RECORD ${n}`],
    [/^(\d+) località$/u, (_, n) => `${n} ${Number(n)===1?'municipality':'municipalities'}`],
    [/^— località$/u, () => '— municipalities'],
    [/^Il riepilogo si riferisce ai (\d+) comuni attualmente visibili: (.+)\.$/u,
      (_, n, names) => `The overview reflects the ${n} currently visible municipalities: ${names}.`],
    [/^(\d[\d.]*) (persona|persone)$/u, (_, n) => `${enNumber(n)} ${num(n)===1?'person':'people'}`],
    [/^— (persone|famiglie|risultati)$/u, (_, w) => `— ${{persone:'people',famiglie:'families',risultati:'results'}[w]}`],
    [/^(\d[\d.]*) famiglie$/u, (_, n) => `${enNumber(n)} families`],
    [/^(\d[\d.]*) risultati$/u, (_, n) => `${enNumber(n)} results`],
    [/^Mostra altre persone \((\d[\d.]*) restanti\) ↓$/u, (_, n) => `Show more people (${enNumber(n)} remaining) ↓`],
    [/^([^<>]+) — Esplora la rete \| Radici di Calabria$/u, (_, name) => `${name} — Explore the network | Radici di Calabria`],
    [/^Sono consultabili tutti i profili, le famiglie e gli eventi contenuti nell'archivio di (.+)\. Origine: (.+)\.$/u,
      (_, town, source) => `All people, families, and events in the ${town} archive are available. Source: ${source}.`],
    [/^Profili con morte registrata o nascita entro il (\d+)\. Alcuni profili e collegamenti non sono pubblicati\.$/u,
      (_, year) => `Profiles with a recorded death or birth by ${year}. Some profiles and connections have not been published.`],
    [/^Nessuna persona trovata con questi filtri\. Prova a cercare solo il cognome o un intervallo di nascita diverso\.$/u,
      () => 'No matching people found. Try searching by surname only or selecting a different birth period.'],
    [/^(NONNI|GENITORI|PERSONA E CONIUGI|FIGLI|NIPOTI) · (\d+) altri non visualizzati$/u,
      (_, label, n) => `${IT_EN[label]} · ${n} more not shown`],
    [/^Età registrata: (.+)$/u, (_, n) => `Recorded age: ${n}`],
    [/^Matrimonio: (.+)$/u, (_, d) => `Marriage: ${d}`],
    [/^(\d+) (nucleo|nuclei)$/u, (_, n) => `${n} ${Number(n)===1?'family unit':'family units'}`],
    [/^Percorso individuato: (\d+) (passaggio|passaggi) attraverso le relazioni registrate\.$/u,
      (_, n) => `Connection found: ${n} recorded ${Number(n)===1?'step':'steps'}.`],
    [/^Non è stato trovato un percorso entro 12 passaggi tra$/u, () => 'No path within 12 steps was found between'],
    [/^nella rete genealogica\. Questo non dimostra l’assenza di parentela: i dati di origine possono essere incompleti\.$/u,
      () => 'in the genealogy network. This does not rule out kinship: the original records may be incomplete.'],
    [/^(\d[\d.]*) (persona|persone) · (\d[\d.]*) collegamenti · (\d[\d.]*) (nodo espanso|nodi espansi)$/u,
      (_, people, _p, links, nodes) => `${enNumber(people)} ${num(people)===1?'person':'people'} · ${enNumber(links)} connections · ${enNumber(nodes)} expanded ${num(nodes)===1?'node':'nodes'}`],
    [/^(.+) \(([^()]*)\) · (\d[\d.]*) relazioni dirette · (Clicca di nuovo sul nodo per richiuderlo|Clicca sul nodo per espanderlo)$/u,
      (_, name, dates, n, action) => `${name} (${dates}) · ${enNumber(n)} direct relationships · ${IT_EN[action]}`],
    [/^Questo clic porterebbe a (\d[\d.]*) persone\. Per conservare la fluidità del browser il limite della vista è (\d[\d.]*) nodi\. Torna al profilo di partenza oppure richiudi alcuni rami\.$/u,
      (_, people, max) => `This expansion would show ${enNumber(people)} people. To keep the graph responsive, the limit is ${enNumber(max)} nodes. Return to the starting profile or collapse a few branches.`],
    [/^(.+), (maschio|femmina|sesso non indicato), ([^.]+)\. (Espandi|Richiudi) relazioni dirette$/u,
      (_, name, sex, dates, action) => `${name}, ${IT_EN[sex]}, ${dates}. ${IT_EN[action]} direct relationships`],
    [/^(.+) \(([^()]*)\) — (Richiudi|Espandi) relazioni$/u,
      (_, name, dates, action) => `${name} (${dates}) — ${IT_EN[action]} relationships`],
    [/^File dati non trovato \((\d+)\)\.$/u, (_, status) => `Data file not found (${status}).`],
    [/^(.+) · (\d+) (persone|famiglie)$/u, (_, name, n, kind) => `${name} · ${enNumber(n)} ${kind==='persone'?'people':'families'}`],
    [/^(\d+) (persone|famiglie)$/u, (_, n, kind) => `${enNumber(n)} ${kind==='persone'?'people':'families'}`],
  ];
  const NUMBER_AREAS = ['.summary-value','.town-facts dd','#statPeople','#statFamilies','#statEvents'];
  const rawTexts = new WeakMap();
  const rawAttributes = new WeakMap();
  const pending = new Set();
  let flushScheduled = false;
  let lang = 'it';
  let observer;

  function num(value) { return Number(String(value).replace(/\./g, '').replace(/,/g,'')); }
  function enNumber(value) { const n=num(value); return Number.isFinite(n) ? n.toLocaleString('en-US') : value; }
  function translateItalian(text) {
    const v = text.trim();
    if (Object.prototype.hasOwnProperty.call(IT_EN,v)) return IT_EN[v];
    for (const [re, fn] of DYNAMIC) {
      const m=v.match(re);
      if(m) return fn(...m);
    }
    return null;
  }
  function numericElement(textNode) {
    const owner = textNode.parentElement;
    return Boolean(owner && owner.matches && NUMBER_AREAS.some(selector => owner.matches(selector)));
  }
  function translateTextSource(source, node) {
    const m=source.match(/^(\s*)([\s\S]*?)(\s*)$/u);
    if (!m) return source;
    const core=m[2];
    if (!core) return source;
    let rendered=translateItalian(core);
    if (rendered===null && numericElement(node) && /^(?:\d{1,3}(?:\.\d{3})+|\d{4,})$/.test(core)) rendered=enNumber(core);
    return rendered===null?source:m[1]+rendered+m[3];
  }
  function applyText(node) {
    if (!node || node.nodeType!==Node.TEXT_NODE || !node.parentElement) return;
    if (node.parentElement.closest('script,style,noscript,textarea,[data-i18n-skip]')) return;
    const current=node.nodeValue;
    let entry=rawTexts.get(node);
    if (!entry || current!==entry.rendered) {
      entry={source:current,rendered:current}; rawTexts.set(node,entry);
    }
    const desired=lang==='en'?translateTextSource(entry.source,node):entry.source;
    if (node.nodeValue!==desired) node.nodeValue=desired;
    entry.rendered=desired;
  }
  const TRANSLATED_ATTRS=['placeholder','title','aria-label','alt','content'];
  function applyAttrs(el) {
    if (!el || el.nodeType!==Node.ELEMENT_NODE || el.closest('script,style,[data-i18n-skip]')) return;
    let stored=rawAttributes.get(el);
    if (!stored) {stored=new Map();rawAttributes.set(el,stored);}
    for(const attr of TRANSLATED_ATTRS){
      if(!el.hasAttribute(attr))continue;
      const current=el.getAttribute(attr);
      let entry=stored.get(attr);
      if(!entry||current!==entry.rendered){entry={source:current,rendered:current};stored.set(attr,entry);}
      const desired=lang==='en'?(translateItalian(entry.source)??entry.source):entry.source;
      if(current!==desired)el.setAttribute(attr,desired);
      entry.rendered=desired;
    }
  }
  function translateSubtree(root) {
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){applyText(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE) return;
    if(root.nodeType===Node.ELEMENT_NODE && root.matches('script,style,noscript,textarea,[data-i18n-skip]')) return;
    if(root.nodeType===Node.ELEMENT_NODE)applyAttrs(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let item;
    while((item=walker.nextNode())) {
      if(item.nodeType===Node.TEXT_NODE) applyText(item);
      else applyAttrs(item);
    }
  }
  function flush(){
    flushScheduled=false;
    for(const item of pending)translateSubtree(item);
    pending.clear();
  }
  function queueTranslate(node){
    pending.add(node);
    if(!flushScheduled){flushScheduled=true;queueMicrotask(flush);}
  }
  function applyLangToPage(){
    document.documentElement.lang=lang;
    document.querySelectorAll('.rc-lang-switch button').forEach(b=>{
      const chosen=b.dataset.rcLang===lang;
      b.setAttribute('aria-pressed',String(chosen));
      b.classList.toggle('is-selected',chosen);
    });
  }
  function setLanguage(value,{changeUrl=true}={}){
    lang=value==='en'?'en':'it';
    try{localStorage.setItem(STORAGE_KEY,lang);}catch(_e){}
    applyLangToPage();
    translateSubtree(document.documentElement);
    if(changeUrl && window.history?.replaceState){
      const url=new URL(window.location.href);
      if(lang==='en')url.searchParams.set('lang','en');
      else url.searchParams.delete('lang');
      try { history.replaceState(history.state,'',url); } catch (_e) { /* e.g. local preview */ }
    }
    window.dispatchEvent(new CustomEvent('radici:languagechange',{detail:{lang}}));
  }
  function makeSwitch(){
    const div=document.createElement('div');div.className='rc-lang-switch';div.setAttribute('role','group');div.setAttribute('aria-label','Lingua del sito');
    for(const code of ['it','en']){
      const b=document.createElement('button');b.type='button';b.dataset.rcLang=code;
      b.textContent=code.toUpperCase();b.title=code==='it'?'Italiano':'English';
      b.addEventListener('click',()=>setLanguage(code));div.appendChild(b);
    }
    const header=document.querySelector('.header-inner, .topbar-inner');
    if(!header) return;
    const before=header.querySelector('.nav-cta, .mobile-nav-toggle, .toplinks');
    if(before)header.insertBefore(div,before);
    else header.append(div);
  }
  function init(){
    const requested=new URLSearchParams(location.search).get('lang');
    let stored='it';try{stored=localStorage.getItem(STORAGE_KEY)||'it';}catch(_e){}
    lang = requested==='en'||requested==='it' ? requested : (stored==='en'?'en':'it');
    makeSwitch();
    applyLangToPage();
    translateSubtree(document.documentElement);
    observer=new MutationObserver(records=>{
      for(const r of records){
        if(r.type==='characterData')queueTranslate(r.target);
        if(r.type==='attributes')queueTranslate(r.target);
        if(r.type==='childList')for(const node of r.addedNodes)queueTranslate(node);
      }
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,
      attributes:true,attributeFilter:TRANSLATED_ATTRS});
  }
  window.RADICI_I18N={get lang(){return lang;},setLanguage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
