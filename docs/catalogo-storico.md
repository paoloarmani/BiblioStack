# Importare il catalogo storico (WinIride)

Il vecchio catalogo della biblioteca, esportato da WinIride (`SCUOLE.XML`), viene convertito in uno
script SQL che popola un database BiblioStack appena installato.

> **I dati non stanno nel repository.** XML, SQL, CSV e cache contengono il patrimonio e i dati della
> biblioteca: si conservano a parte, nel pacchetto `bibliostack-catalogo-<data>.tar.gz`. Nel repository
> c'è solo il convertitore, `tools/catalogo-winiride/converti.py`, senza dati.

## Contenuto del pacchetto

| File | Contenuto |
|---|---|
| `import_bibliostack.sql` | Opere, copie, autori, editori, generi, soggetti, scaffali. Un'unica transazione. |
| `revisione/*.csv` | Gli stessi dati in CSV (UTF-8, separatore `;`) per controllarli con un foglio di calcolo. |
| `revisione/anomalie.csv` | Tutto ciò che è stato corretto, scartato o va verificato a mano. |
| `revisione/riepilogo.txt` | Statistiche della conversione. |
| `rigenerare/` | Convertitore e cache delle verifiche ISBN della conversione consegnata. |
| `LEGGIMI.md` | Dettagli specifici di quella conversione. |

## Importazione

Lo script SQL va eseguito su un database **creato dagli script `docker/postgres/init/*.sql` e senza
seed demo**. Se trova già opere, copie, autori o scaffali si ferma senza scrivere nulla. In ogni
caso è un'unica transazione: o entra tutto o niente.

### Sviluppo

```bash
./bibliostack.sh reset --senza-seed                         # CANCELLA il DB di sviluppo e lo ricrea vuoto
./bibliostack.sh import-catalogo /percorso/import_bibliostack.sql
./bibliostack.sh admin admin@scuola.it                      # password chiesta a terminale
```

### Produzione (prima installazione)

```bash
./bibliostack.sh prod up                                    # vedi docs/produzione.md
./bibliostack.sh prod import-catalogo /percorso/import_bibliostack.sql
./bibliostack.sh prod admin admin@scuola.it
./bibliostack.sh prod backup                                # primo backup, vedi docs/backup.md
```

Il catalogo non contiene utenti: studenti e docenti si registrano con Google (dominio in
`ALLOWED_GOOGLE_DOMAINS`) oppure li crea l'amministratore.

## Come sono stati trattati i dati

| WinIride | BiblioStack | Note |
|---|---|---|
| `codice_scheda`, `isbn` | `works.id` | ISBN-13 se valido, così il lettore di barcode ritrova anche i libri vecchi; altrimenti il codice scheda (`M-…`). Le schede doppie (stesso ISBN e titolo) sono fuse. |
| `titolo/*` | `title`, `other_title_information` | Convenzioni catalografiche ripulite: `<Il >Principe` → "Il Principe", `100 =cento errori` → "100 errori". |
| `autore/*` | `authors`, `author_works` | Varianti unificate, "AA.VV." scartato, 175 diciture di ruolo ridotte a 16 (Autore, Curatore, Traduttore…). |
| `editore` | `publishers` | Varianti di scrittura unificate. |
| `genere` | `genres` | Refusi corretti ("romazo" → "romanzo"). |
| `soggetti`, `descrittori_*` | `subjects`, `work_subjects` | Argomenti dell'opera, usati dalla ricerca e dal filtro del catalogo. |
| `abstract`, note, collana, edizione | `description` | |
| `inventario` | `items.id` | Gli inventari usati da più copie restano alla copia coerente con la cronologia; le altre diventano `NNNN-DUP2`. |
| `collocazione` | `items.shelf_mark` + `locations` | Collocazione completa ("A1 I 3") sulla copia; lo scaffale ("A1") in `locations`. |
| `prezzo` (lire), `euro` | `items.price` (EUR) | Lire convertite a 1936,27. |
| `disponibilità` = N | `items.loanable = false` | "Non prestabile": raccolte, dizionari, consultazione in sede. |
| `disponibilità` = P, `U-…` | — | Importate come disponibili e segnalate in `anomalie.csv` da verificare a scaffale. |

Gli ISBN sono stati verificati su Open Library e Google Books: in caso di corrispondenza sono stati
corretti gli ISBN con una cifra sbagliata e aggiunti copertina, pagine e anno quando mancavano.

## Dopo l'importazione

Aprire `revisione/anomalie.csv` e filtrare per colonna `problema`. I casi principali:

- **numero di inventario già usato:** confrontare con il registro cartaceo;
- **collocazione già assegnata:** verificare a scaffale;
- **copia risultava in prestito (`U-…`):** l'utente del vecchio sistema non è nell'export;
- **ISBN che nelle banche dati è un altro libro:** spesso un altro volume della stessa collana;
- **possibile stesso autore ("Rossi, M." / "Rossi, Mario"):** unire da interfaccia se è la stessa persona.

Le correzioni si fanno direttamente dall'app (Opere → Modifica / Scheda e copie).

## Rigenerare l'SQL

Serve solo se cambiano le regole di conversione. Richiede Python 3.9 o superiore, senza librerie esterne.

```bash
cd tools/catalogo-winiride
cp /percorso/SCUOLE.XML .                     # ignorato da git
python3 -I converti.py SCUOLE.XML             # usa le cache, se presenti, senza andare in rete
python3 -I converti.py SCUOLE.XML --online    # verifica gli ISBN su Open Library
python3 -I converti.py SCUOLE.XML --online --google --google-max=800
```

- Il risultato va in `tools/catalogo-winiride/output/`, ignorato da git.
- Per non ripetere le richieste, copiare accanto allo script le cache `cache_*.json` del pacchetto.
- `--google` usa `GOOGLE_BOOKS_API_KEY` (variabile d'ambiente o `backend/.env`). Fa al massimo
  `--google-max` richieste per esecuzione, una al secondo, e si ferma alla quota esaurita.
- Le scelte modificabili (nome dell'istituto, significato dei codici di disponibilità, lingue,
  paesi, ruoli) sono nella sezione `CONFIGURAZIONE` in cima allo script.
