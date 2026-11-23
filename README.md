# BiblioStack

## Descrizione del progetto

BiblioStack è un sistema web full-stack per la gestione di una biblioteca.
L’applicazione offre un catalogo pubblico delle opere e un’area autenticata
per utenti, bibliotecari e amministratori.

Il progetto permette di:

- Consultare e cercare le opere presenti nel catalogo, anche per soggetto
  (argomento), genere, lingua ed editore;
- Visualizzare i dettagli di un’opera, sapere dove trovarla a scaffale
  (collocazione) e prenotare le copie disponibili;
- Gestire prestiti, restituzioni, prenotazioni e storico delle attività, anche
  prestando un libro direttamente dalla gestione opere;
- Gestire utenti, ruoli, sospensioni, opere e copie dalla dashboard
  amministrativa: collocazione univoca di ogni copia, copie di sola
  consultazione (prestito non consentito), copie danneggiate o smarrite;
- Usare tessere e codici QR per l’identificazione degli utenti;
- Inviare notifiche e promemoria automatici per prestiti e prenotazioni;
- Arricchire i dati bibliografici tramite Google Books API e Open Library API.

Il repository è organizzato così:

- `frontend/`: interfaccia React eseguita con Vite (in produzione servita da Caddy);
- `backend/`: API REST basate su Node.js ed Express;
- `docker/`: compose di sviluppo e produzione, immagine PostgreSQL, script SQL di
  inizializzazione (`postgres/init`) e migrazioni (`postgres/migrations`);
- `tools/catalogo-winiride/`: convertitore del vecchio catalogo WinIride;
- `docs/`: guide di [messa in produzione](docs/produzione.md),
  [backup e ripristino](docs/backup.md) e
  [importazione del catalogo storico](docs/catalogo-storico.md);
- `bibliostack.sh`: comandi per sviluppo e produzione (`./bibliostack.sh help`).

### Stack tecnologico

- **Frontend:** React, React Router, Vite, Tailwind CSS, shadcn/ui,
  React Hook Form, Zod, TanStack Table e Axios.
- **Backend:** Node.js, Express, Drizzle ORM, Zod, JWT, Argon2 e Pino.
- **Database e servizi:** PostgreSQL e Redis, avviati tramite Docker Compose.
- **Produzione:** Caddy (HTTPS automatico e reverse proxy) davanti al backend.

## Avvio rapido con Docker (nessuna installazione oltre a Docker)

L'intero stack (PostgreSQL, Redis, backend e frontend con hot reload) può
girare in container. Sull'host serve solo Docker con il plugin `docker compose`.

```bash
./bibliostack.sh up      # costruisce le immagini e avvia tutto
./bibliostack.sh seed    # carica i dati di esempio (solo al primo avvio)
./bibliostack.sh smoke   # verifica rapida delle API
```

- Frontend: http://localhost:5173 · Backend: http://localhost:5001
- Utenti di test (password `Password1!`): `admin@biblioteca.it`,
  `mario.rossi@biblioteca.it` (bibliotecario), `sara.neri@studenti.it` (studente)
- Senza `RESEND_API_KEY` le email non partono: in sviluppo i link di reset
  password e attivazione account vengono stampati in `./bibliostack.sh logs backend`.
- `./bibliostack.sh reset` cancella e ricrea il database (con `--senza-seed` lo
  lascia vuoto, per importare un catalogo); `./bibliostack.sh help` elenca tutti i
  comandi (psql, redis-cli, lint, build, backup, restore, shell nei container...).
- Valori di default e override: `docker/compose.dev.yml` e `docker/.env.dev.example`.

Su Windows usare WSL2 oppure Git Bash per lanciare lo script.

## Messa in produzione

In breve: `docker/compose.prod.yml` avvia quattro container. **Caddy** (`web`) è l'unico esposto,
gestisce HTTPS e serve il frontend compilato; backend, PostgreSQL e Redis restano interni.

```bash
cp docker/.env.prod.example docker/.env.prod   # dominio, password e segreti
./bibliostack.sh prod up                       # build e avvio
./bibliostack.sh prod admin admin@scuola.it    # primo amministratore
```

HTTPS è obbligatorio, perché i cookie di sessione sono `Secure`. La guida
[docs/produzione.md](docs/produzione.md) descrive:
- i quattro scenari HTTPS: dominio pubblico con Let's Encrypt, rete interna, certificato della
  scuola, dietro un reverse proxy esistente;
- tutte le variabili di configurazione;
- gli aggiornamenti con le migrazioni del database;
- i problemi frequenti.

## Backup e ripristino

```bash
./bibliostack.sh prod backup                 # dump compresso in backups/ (escluso da git)
./bibliostack.sh prod restore <file.sql.gz>  # sostituisce i dati, in un'unica transazione
```

La guida [docs/backup.md](docs/backup.md) spiega cosa salvare, come pianificare il backup con cron,
come copiarlo fuori dal server e come ripristinarlo su un server nuovo.

## Catalogo storico (WinIride)

Il vecchio catalogo si importa da uno script SQL consegnato a parte. I dati non stanno nel
repository; qui c'è solo il convertitore, in `tools/catalogo-winiride/`.

```bash
./bibliostack.sh reset --senza-seed                    # sviluppo: database vuoto
./bibliostack.sh import-catalogo import_bibliostack.sql
./bibliostack.sh admin admin@scuola.it
```

Procedura completa, regole di conversione e revisione delle anomalie:
[docs/catalogo-storico.md](docs/catalogo-storico.md).

## Istruzioni di installazione (manuale)

### Prerequisiti

Installare i seguenti strumenti:

- Node.js e npm;
- Docker Desktop con Docker Compose;
- Git.

### 1. Clonare il repository

```bash
git clone https://github.com/Mat98-98/BiblioStack.git
cd BiblioStack
```

### 2. Configurare PostgreSQL e Redis

Creare il file di configurazione Docker:

```bash
cp docker/.env.example docker/.env
```

Modificare `docker/.env` impostando almeno valori validi per:

```dotenv
POSTGRES_USER=bibliostack
POSTGRES_PASSWORD=una-password-sicura
POSTGRES_DB=bibliostack
POSTGRES_VERSION=18.3
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5433
REDIS_VERSION=8.10.2-alpine
REDIS_PORT=6379
REDIS_EXTERNAL_PORT=6379
REDIS_PASSWORD=una-password-sicura
```

Su macOS è consigliabile usare una porta diversa da 5432 come porta PostgreSQL per evitare
conflitti con altri servizi locali.

Avviare i container dalla cartella `docker/`:

```bash
cd docker
docker compose up -d
cd ..
```

Gli script presenti in `docker/postgres/init/` inizializzano automaticamente
lo schema, i trigger, le viste e gli indici del database al primo avvio del
volume PostgreSQL.

### 3. Configurare il backend

Creare il file `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Impostare almeno le variabili necessarie all’avvio locale:

```dotenv
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://bibliostack:una-password-sicura@localhost:5433/bibliostack
PORT=5001

JWT_SECRET=una-chiave-jwt-locale
JWT_REFRESH=una-seconda-chiave-jwt-locale
CARD_SECRET=una-chiave-per-le-tessere

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=una-password-sicura
```

Le variabili per Google OAuth, Google Books, Resend e i domini autorizzati
sono necessarie solo per usare le rispettive integrazioni. Per un ambiente
locale, usare valori fittizi soltanto per i servizi che non si intendono
utilizzare.

Installare le dipendenze ed eseguire, se necessario, il seed:

```bash
cd backend
npm install
node src/db/seed.js
```

Il seed inserisce dati di esempio: utenti di test (admin, bibliotecari,
studenti), lingue, paesi, editori, generi, soggetti, opere, copie e prestiti.
Non va usato in produzione.

### 4. Configurare il frontend

Creare il file `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Impostare l’URL delle API:

```dotenv
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=il-tuo-client-id-google
```

Installare le dipendenze:

```bash
cd frontend
npm install
```

## Utilizzo

### Avviare l’applicazione in sviluppo

Avviare il backend dalla cartella `backend/`:

```bash
npm run dev
```

Il server sarà disponibile su `http://localhost:5001`. L’endpoint
`http://localhost:5001/` può essere usato per verificare che il server sia
attivo.

In un secondo terminale, avviare il frontend dalla cartella `frontend/`:

```bash
npm run dev
```

L’interfaccia sarà disponibile, normalmente, su
`http://localhost:5173`.

### Comandi disponibili

#### Backend

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il backend con Nodemon. |
| `npm start` | Avvia il backend senza Nodemon. |
| `npm run drizzle:generate` | Genera le migrazioni Drizzle. |
| `npm run drizzle:push` | Sincronizza lo schema tramite Drizzle. |

#### Frontend

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia il server di sviluppo Vite. |
| `npm run build` | Crea la build di produzione. |
| `npm run preview` | Serve localmente la build di produzione. |
| `npm run lint` | Esegue ESLint. |

### Principali sezioni dell’applicazione

- `/`: home page pubblica;
- `/catalog`: catalogo e ricerca delle opere;
- `/works/:id`: dettaglio di un’opera;
- `/profile`: profilo dell’utente autenticato;
- `/card`: tessera personale e codice QR;
- `/loans`: storico dei prestiti;
- `/reservations`: storico delle prenotazioni;
- `/admin`: dashboard amministrativa;
- `/admin/users`: gestione degli utenti;
- `/admin/works`: gestione delle opere;
- `/admin/loans`: gestione dei prestiti.

Le rotte amministrative richiedono autenticazione e autorizzazioni adeguate.

## Esempi / Demo

### Consultare il catalogo

1. Aprire `http://localhost:5173/catalog`.
2. Cercare un’opera usando la barra di ricerca.
3. Aprire una scheda per visualizzare dettagli e disponibilità.
4. Effettuare l’accesso per creare una prenotazione.

<!-- INSERISCI QUI LO SCREENSHOT DEL CATALOGO -->
![Catalog](docs/images/catalog.png)

### Gestire opere e copie

1. Accedere con un account autorizzato.
2. Aprire `http://localhost:5173/admin/works`: per ogni opera si vedono le copie
   disponibili sul totale.
3. Creare o modificare un’opera, con generi e soggetti.
4. Aggiungere copie con collocazione (es. "A1 I 3") e scegliere se il prestito è
   consentito (le copie di sola consultazione non si prestano né si prenotano).
5. Con **Presta** registrare un prestito: si sceglie la copia, si cerca l'utente
   per nome, email o tessera (o si scansiona il QR) e si conferma la scadenza.

![Gestione opere](docs/images/gestione-opere.png)

![Prestito dalla gestione opere](docs/images/presta.png)

### Gestire prestiti e prenotazioni

1. Aprire la sezione prestiti dalla dashboard, oppure usare **Presta** dalla
   gestione opere o dalla scheda di un'opera.
2. Registrare un nuovo prestito o una restituzione. Le copie danneggiate si
   possono prestare, quelle smarrite no.
3. Consultare le prenotazioni pronte per il ritiro.
4. Verificare notifiche e scadenze generate dal sistema.

Ogni utente ritrova prestiti, scadenze e prenotazioni nel proprio profilo (`/profile`):

![Profilo utente](docs/images/profilo.png)

### Tessera e codice QR

1. Accedere alla pagina `/card`.
2. Visualizzare la tessera personale.
3. Usare il codice QR nelle operazioni che richiedono la verifica dell’utente.
![QR Code](docs/images/qr_code.png)