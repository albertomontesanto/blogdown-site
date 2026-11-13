# IrisPlex Local — 3 colori, versione 2.0

## Avvio
Apri `index.html` con Safari o Chrome. Funziona senza Internet. In alternativa, nel Terminale spostati in questa cartella e usa `python3 -m http.server 8000`; visita quindi `http://localhost:8000`.

## Utilizzo
1. Seleziona con un clic uno dei quattro valori (0, 1, 2 o NA) per ciascuno dei sei SNP. Il pulsante mostra anche il genotipo.
2. Imposta obbligatoriamente HERC2 rs12913832. Per HERC2 il laboratorio conta A: GG=0, AG=1, AA=2.
3. Premi **Mostra probabilità predette**: compariranno Blu, Verde/Castano-verde, Marrone.
4. Puoi azzerare le selezioni ed esportare la predizione in CSV. Il pulsante CSV si abilita solo dopo il calcolo.

## Alleli e genotipi (orientamento del dataset ricevuto)
| SNP | Allele contato | 0 copie | 1 copia | 2 copie |
| --- | --- | --- | --- | --- |
| HERC2 rs12913832 | A | GG | AG | AA |
| OCA2 rs1800407 | A | GG | AG | AA |
| SLC24A4 rs12896399 | T | GG | GT | TT |
| SLC45A2 rs16891982 | C | GG | GC | CC |
| TYR rs1393350 | A | GG | AG | AA |
| IRF4 rs12203592 | T | CC | CT | TT |

I conteggi indicati sono stati verificati rispetto alle colonne numeriche e ai genotipi osservati nei 238 record del file Excel fornito. I genotipi eterozigoti possono essere annotati anche in ordine inverso (AG/GA, GT/TG, GC/CG, CT/TC).

## Modello
Interfaccia aggiornata senza riaddestrare né modificare coefficienti del precedente modello 3-colors. Modello di regressione logistica multinomiale L2 su tre categorie derivanti da `Colore_BUIO`:
- Blu: A e AG (29 individui)
- Verde/Castano-verde: V e CV (55 individui)
- Marrone: CC, CS e N (154 individui)

HERC2 usa due indicatori (AG, AA; GG riferimento); gli altri SNP usano il conteggio 0/1/2. Gli SNP mancanti diversi da HERC2 sono imputati a 0 prima della standardizzazione, come nel modello precedente. Non è permessa una predizione senza HERC2. Il modello è integrato in `model.js` e disponibile in `modello_3_colori.json`.

Le metriche CV della versione precedente (accuratezza circa 76,9%, balanced accuracy circa 68,6%, AUC macro OvR circa 0,840) sono esplorative: il parametro di regolarizzazione era stato scelto usando la stessa CV. Manca una validazione esterna. Non è il modello ufficiale Erasmus MC. Non è idoneo all'impiego forense individuale senza ulteriore validazione e calibrazione.

## Contenuti
- `index.html`: interfaccia web
- `styles.css`: stile responsive, maschera a pulsanti
- `app.js`: interazione, calcolo, esportazione CSV
- `model.js`: modello incorporato per utilizzo senza server
- `modello_3_colori.json`: copia leggibile dei coefficienti
- `assets/occhi_blu_marroni.jpg`: immagini originali degli occhi create per questa interfaccia

Nessun dato viene inviato ad alcun server. I dati digitati rimangono nel browser (salvo esportazione manuale).
