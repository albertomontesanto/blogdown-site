/* Catalogo reti. Aggiungi qui un oggetto per ciascun comune.
   Gli archivi GEDCOM convertiti si trovano in data/<slug>/rete.json.
   Le voci con archivioPersonalizzato=true aprono il visualizzatore GEDCOM.
   Puoi usare url: 'https://...' per puntare a una rete ospitata altrove. */
window.RADICI_COMUNI = [
  {
    slug: "oriolo", nome: "Oriolo", provincia: "Cosenza", sigla: "CS",
    descrizione: "Persone, famiglie e legami di parentela della rete genealogica di Oriolo.",
    periodo: "1713–1910", persone: 36578, famiglie: 11062, eventi: 39026,
    url: "", ready: true, archivioPersonalizzato: true, cover: "blu"
  },
  {
    slug: "san-lorenzo-del-vallo", nome: "San Lorenzo del Vallo", provincia: "Cosenza", sigla: "CS",
    descrizione: "Archivio genealogico di San Lorenzo del Vallo, consultabile per nomi e relazioni.",
    periodo: "1721–1910", persone: 15475, famiglie: 5206, eventi: 13828,
    url: "", ready: true, archivioPersonalizzato: true, cover: "verde"
  },
  {
    slug: "bocchigliero", nome: "Bocchigliero", provincia: "Cosenza", sigla: "CS",
    descrizione: "Persone, famiglie ed eventi presenti nell’archivio genealogico di Bocchigliero.",
    periodo: "1809–2014", persone: 5480, famiglie: 1588, eventi: 5488,
    url: "", ready: true, archivioPersonalizzato: true, cover: "terra"
  },
  {
    slug: 'cariati', nome: 'Cariati', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'La memoria genealogica di Cariati: persone, famiglie e relazioni tra generazioni.',
    periodo: "1720–2025", persone: 28888, famiglie: 9394, eventi: 29184, url: '', ready: true, cover: 'verde',
    archivioPersonalizzato: true
  },
  {
    slug: 'pedace', nome: 'Pedace', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'Un percorso tra nuclei familiari, generazioni e documenti d’archivio.',
    periodo: '', persone: null, url: '', cover: 'terra'
  },
  {
    slug: 'montegiordano', nome: "Montegiordano", provincia: "Cosenza", sigla: "CS",
    descrizione: "Rete genealogica di Montegiordano con nuclei familiari e collegamenti tra generazioni.",
    periodo: "1734–1968", persone: 12519, url: "", cover: "blu",
    famiglie: 3018,
    eventi: 16561,
    ready: true,
    archivioPersonalizzato: true
  },
  {
    slug: 'luzzi', nome: 'Luzzi', provincia: 'Cosenza', sigla: 'CS',
    descrizione: 'Famiglie, matrimoni e discendenze ricostruiti attraverso fonti storiche.',
    periodo: '', persone: null, url: '', cover: 'verde'
  },
  {
    slug: 'petilia-policastro', nome: "Petilia Policastro", provincia: "Crotone", sigla: "KR",
    descrizione: "Rete genealogica storica di Petilia Policastro, con persone, nuclei familiari ed eventi.",
    periodo: "1710–1977", persone: 47325, url: "", cover: "ocra",
    famiglie: 14249,
    eventi: 52601,
    ready: true,
    archivioPersonalizzato: true
  }
];
