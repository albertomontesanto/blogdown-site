/* Catalogo reti. Aggiungi qui un oggetto per ciascun comune.
   I file esportati da MacFamilyTree vanno in reti/<slug>/ (incluso index.html).
   In hosting, la pagina principale verifica automaticamente la presenza di index.html.
   Puoi usare url: 'https://...' per puntare a una rete ospitata altrove. */
window.RADICI_COMUNI = [
  {
    slug: 'cariati', nome: 'Cariati', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'La memoria genealogica di Cariati: persone, famiglie e relazioni tra generazioni.',
    periodo: '1720–1910', persone: 30566, famiglie: 9783, eventi: 29517, url: '', ready: true, cover: 'verde'
  },
  {
    slug: 'pedace', nome: 'Pedace', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'Un percorso tra nuclei familiari, generazioni e documenti d’archivio.',
    periodo: '', persone: null, url: '', cover: 'terra'
  },
  {
    slug: 'montegiordano', nome: 'Montegiordano', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'Le connessioni genealogiche di una comunità tra costa e entroterra.',
    periodo: '', persone: null, url: '', cover: 'blu'
  },
  {
    slug: 'luzzi', nome: 'Luzzi', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'Famiglie, matrimoni e discendenze ricostruiti attraverso fonti storiche.',
    periodo: '', persone: null, url: '', cover: 'verde'
  },
  {
    slug: 'petilia-policastro', nome: 'Petilia Policastro', provincia: 'Crotone', sigla: 'KR',
    descrizione: 'Una raccolta dedicata alla memoria familiare e agli atti del territorio.',
    periodo: '', persone: null, url: '', cover: 'ocra'
  }
];
