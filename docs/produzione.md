# Messa in produzione

BiblioStack in produzione gira come quattro container Docker, descritti in `docker/compose.prod.yml`
e gestiti con `./bibliostack.sh prod …`.

## Architettura

```
                 Internet / rete della scuola
                            │  80, 443
                 ┌──────────▼──────────┐
                 │  web  (Caddy)       │  HTTPS, file del frontend compilato,
                 │                     │  inoltro di /api al backend
                 └──────────┬──────────┘
                            │  rete interna Docker
                 ┌──────────▼──────────┐
                 │  backend (Node)     │  API REST, job pianificati (scadenze, promemoria)
                 └─────┬──────────┬────┘
              ┌────────▼───┐  ┌───▼────────┐
              │ db         │  │ redis      │
              │ PostgreSQL │  │ sessioni,  │
              │            │  │ rate limit │
              └────────────┘  └────────────┘
```

| Servizio | Immagine | Esposto | Dati persistenti (volume) |
|---|---|---|---|
| `web` | `frontend/Dockerfile`, target `prod` (Caddy 2.10) | **sì**, 80 e 443 | `caddy_data`: certificati HTTPS |
| `backend` | `backend/Dockerfile`, target `prod` (Node 22, solo dipendenze di produzione) | no | — |
| `db` | `docker/postgres` (PostgreSQL 18.3 + locale italiano) | no | `pgdata`: **tutti i dati della biblioteca** |
| `redis` | `redis:8.10.2-alpine` | no | `redisdata`: sessioni (refresh token), token di reset password, contatori del rate limit |

- Il frontend chiama l'API sullo stesso indirizzo (`/api`), quindi non serve CORS.
- Tutti i servizi hanno `restart: unless-stopped`: ripartono da soli dopo un riavvio del server,
  purché Docker sia avviato al boot (`sudo systemctl enable docker`).

## Requisiti

- Un server Linux con Docker 24 o superiore e il plugin `docker compose`.
  Bastano 2 CPU, 2–4 GB di RAM e 10 GB di disco, più lo spazio per i backup.
- Un nome DNS che punta al server, se l'app deve avere un certificato pubblico.
- Firewall: aperte solo le porte 80 e 443, o nessuna porta se c'è un proxy davanti (scenario D).

## Primo avvio

```bash
git clone <repository> bibliostack && cd bibliostack
cp docker/.env.prod.example docker/.env.prod
chmod 600 docker/.env.prod                  # contiene password e segreti
nano docker/.env.prod                       # vedi "Configurazione" e "HTTPS"
./bibliostack.sh prod up                    # build delle immagini e avvio
./bibliostack.sh prod admin admin@scuola.it # primo amministratore (password chiesta a terminale)
```

Facoltativo:
- `./bibliostack.sh prod import-catalogo …`, vedi [catalogo-storico.md](catalogo-storico.md);
- un primo backup e la sua pianificazione, vedi [backup.md](backup.md).

Il seed demo **non** va caricato in produzione. Lo schema del database lo creano gli script
`docker/postgres/init/*.sql` alla prima creazione del volume.

## Configurazione (`docker/.env.prod`)

| Variabile | Obbligatoria | Significato |
|---|---|---|
| `SITE_ADDRESS` | sì | Indirizzo servito da Caddy: decide il tipo di HTTPS (vedi sotto). |
| `PUBLIC_URL` | sì | URL con cui gli utenti aprono l'app, per esempio `https://biblioteca.scuola.it`. Serve per CORS e per i link nelle email; ammette più valori separati da virgola. |
| `HTTP_PORT`, `HTTPS_PORT` | no (80, 443) | Porte pubblicate sull'host. Accettano anche `IP:porta`, per esempio `127.0.0.1:8080`. |
| `TRUST_PROXY_HOPS` | no (1) | Proxy fidati davanti al backend: 1 = solo Caddy, 2 = Caddy più un proxy esterno. |
| `TRUSTED_PROXIES` | no | Solo dietro un proxy esterno: da quali indirizzi Caddy accetta `X-Forwarded-For` (`private_ranges` o l'IP del proxy). |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | sì | Proprietario del database: usato solo per creazione dello schema, migrazioni, import e backup. |
| `APP_DB_USER`, `APP_DB_PASSWORD` | sì (password) | Ruolo con cui si collega il backend: solo lettura e scrittura dei dati, nessun permesso sulla struttura. Generare la password con `openssl rand -hex 32` (finisce in un URL: evitare `/ + @`). |
| `REDIS_PASSWORD` | sì | Password di Redis. |
| `JWT_SECRET`, `JWT_REFRESH` | sì | Firmano i token di sessione. Se cambiano, tutti gli utenti devono rifare il login. |
| `CARD_SECRET` | sì | Firma i QR delle tessere. Se cambia, **tutte le tessere stampate smettono di funzionare**. |
| `ALLOWED_GOOGLE_DOMAINS` | sì | Domini le cui email possono creare un account entrando con Google, per esempio `scuola.edu.it`. Il backend non parte se è vuoto. |
| `GOOGLE_CLIENT_ID` | no | Abilita il login con Google. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | no | Posta in uscita tramite l'account tecnico dell'ente (consigliato). Porta 587 = STARTTLS obbligatorio, 465 = TLS. Vedi [Email](#email). |
| `EMAIL_FROM` | no | Mittente delle email, per esempio `Biblioteca ITT Pozzo <biblioteca@scuola.it>`. Con SMTP di norma deve coincidere con `SMTP_USER` o un suo alias. |
| `RESEND_API_KEY` | no | Alternativa a SMTP. Serve un dominio verificato su Resend in `EMAIL_FROM`. |
| `EMAIL_DAILY_LIMIT`, `EMAIL_MONTHLY_LIMIT` | no | Tetto globale sugli invii (default 500/giorno con SMTP; 90/giorno e 2900/mese con Resend). `0` = nessun limite. |
| `LIBRARY_NAME`, `LIBRARY_INSTITUTION`, `LIBRARY_ADDRESS`, `LIBRARY_EMAIL`, `LIBRARY_PHONE`, `LIBRARY_HOURS` | no | Dati mostrati nel footer del sito. `LIBRARY_HOURS` accetta più righe separate da `\|`. |
| `LIBRARY_PRIVACY_URL`, `LIBRARY_RULES_URL`, `LIBRARY_WEBSITE_URL` | no | Link del footer: informativa privacy dell'ente (da impostare: è un obbligo di legge), regolamento dei prestiti, sito della scuola. Solo `http(s)`. |
| `GOOGLE_BOOKS_API_KEY` | no | Ricerca dei dati di un libro tramite ISBN quando si aggiunge un'opera. |
| `LOG_LEVEL` | no (`info`) | Livello dei log del backend. |

Per generare segreti robusti: `openssl rand -base64 48`.

Le variabili `LIBRARY_*`, `SMTP_*` ed `EMAIL_*` sono lette all'avvio del backend: dopo averle
cambiate basta `./bibliostack.sh prod up` (non serve ricompilare il frontend).

## Email

Il backend invia email per reset password, attivazione account e avvisi su prestiti e prenotazioni.
L'ente crea un **account di posta tecnico** per la biblioteca sul proprio provider (per esempio
`biblioteca@scuola.it`) e se ne inseriscono le credenziali SMTP:

```bash
SMTP_HOST=smtp.office365.com      # Microsoft 365; Google Workspace: smtp.gmail.com
SMTP_PORT=587
SMTP_USER=biblioteca@scuola.it
SMTP_PASS=...                     # con Google serve una "password per le app"
EMAIL_FROM=Biblioteca ITT Pozzo <biblioteca@scuola.it>
```

All'avvio il backend verifica la connessione: in `./bibliostack.sh prod logs backend` compare
`SMTP transport ready` oppure l'errore (credenziali, porta, autenticazione SMTP disattivata
sull'account). Con Microsoft 365 l'amministratore deve abilitare "SMTP AUTH" per quella casella.

Il **tetto globale** (`EMAIL_DAILY_LIMIT`) protegge la quota del provider anche da richieste
distribuite, che i limiti per IP non fermano. Raggiunto il tetto le email non partono e nel log
compare `Email quota reached`.

## HTTPS: quale scenario scegliere

HTTPS è **obbligatorio**: in produzione i cookie di sessione sono `Secure` e il browser non li invia
su HTTP. Una versione "solo HTTP" non funzionerebbe, nemmeno in una rete interna.

### A. Server raggiungibile da Internet con un dominio (consigliato)

```dotenv
SITE_ADDRESS=biblioteca.scuola.it
PUBLIC_URL=https://biblioteca.scuola.it
```

- Caddy ottiene e rinnova da solo un certificato **Let's Encrypt**.
- Il DNS deve puntare al server, e le porte 80 e 443 devono essere raggiungibili da Internet,
  anche solo per la verifica del certificato.

### B. Solo rete interna, senza dominio pubblico

```dotenv
SITE_ADDRESS=https://192.168.1.10
PUBLIC_URL=https://192.168.1.10
```

- Con un indirizzo IP, `localhost` o un nome `*.local`, Caddy usa da solo una propria **autorità
  di certificazione interna**. Con un altro nome interno (es. `biblioteca.lan`) bisogna aggiungere
  `tls internal` dentro il blocco del sito in `frontend/Caddyfile`, altrimenti Caddy prova Let's
  Encrypt e fallisce.
- I browser mostrano un avviso finché non considerano attendibile l'autorità interna.
- Per evitare l'avviso, si estrae il certificato radice e lo si installa sui PC della scuola (tramite
  criteri di gruppo o MDM):

  ```bash
  docker compose -f docker/compose.prod.yml --env-file docker/.env.prod \
      cp web:/data/caddy/pki/authorities/local/root.crt ./bibliostack-root.crt
  ```

### C. Certificato fornito dalla scuola

1. Copiare certificato e chiave sul server.
2. Montarli nel servizio `web` (per esempio `./certs:/certs:ro` in `compose.prod.yml`).
3. In `frontend/Caddyfile` aggiungere `tls /certs/fullchain.pem /certs/privkey.pem` dentro il blocco del sito.
4. Ricostruire con `./bibliostack.sh prod up`.

### D. Dietro un reverse proxy già esistente

È il caso di un nginx, Apache, Nginx Proxy Manager o Traefik che già gestisce HTTPS per altri servizi.
Il proxy termina l'HTTPS e inoltra in HTTP a Caddy, che resta in ascolto solo in locale.

```dotenv
SITE_ADDRESS=:80
HTTP_PORT=127.0.0.1:8080          # raggiungibile solo dal proxy sulla stessa macchina
HTTPS_PORT=127.0.0.1:8443         # non usata, ma non deve occupare la 443 del proxy
PUBLIC_URL=https://biblioteca.scuola.it
TRUST_PROXY_HOPS=2
TRUSTED_PROXIES=private_ranges    # oppure l'IP del proxy, se è su un'altra macchina
```

Se il proxy è su un'altra macchina, si usa l'IP della rete interna invece di `127.0.0.1`
(per esempio `HTTP_PORT=10.0.0.20:8080`) e si limita l'accesso dal firewall.

Il proxy deve inoltrare l'host e gli header `X-Forwarded-*`. Esempio per nginx:

```nginx
server {
    listen 443 ssl;
    server_name biblioteca.scuola.it;
    # ssl_certificate ... ; ssl_certificate_key ... ;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Con Nginx Proxy Manager basta creare un *Proxy Host* verso `http://<ip-server>:8080`, con il
certificato SSL attivo e "Force SSL".

Le due impostazioni `TRUSTED_PROXIES` e `TRUST_PROXY_HOPS=2` sono necessarie insieme. Senza,
il backend vedrebbe tutti gli utenti con l'IP del proxy. In quel caso il limite di 200 tentativi
falliti per IP verrebbe raggiunto sommando gli errori di tutta la scuola, bloccando tutti, e nei
log non comparirebbero gli IP reali.

## Operazioni quotidiane

| Cosa | Comando |
|---|---|
| Stato dei container | `./bibliostack.sh prod ps` |
| Log (tutti o un servizio) | `./bibliostack.sh prod logs` · `./bibliostack.sh prod logs backend` |
| Fermare / riavviare | `./bibliostack.sh prod down` · `./bibliostack.sh prod up` |
| Nuovo amministratore o reset della sua password | `./bibliostack.sh prod admin email@scuola.it` |
| Console SQL | `./bibliostack.sh prod psql` |
| Backup / ripristino | vedi [backup.md](backup.md) |

`prod down` non cancella i dati: restano nei volumi. Solo `docker compose … down -v` li cancellerebbe.

## Aggiornare a una nuova versione

```bash
./bibliostack.sh prod backup                 # sempre, prima di aggiornare
git pull
ls docker/postgres/migrations/               # ci sono migrazioni nuove rispetto all'ultimo aggiornamento?
./bibliostack.sh prod sql docker/postgres/migrations/<file>.sql   # una per una, in ordine di data
./bibliostack.sh prod up                     # ricostruisce le immagini e riavvia
```

Se una nuova versione aggiunge variabili obbligatorie, `prod up` si ferma indicando quale manca:
confrontare `docker/.env.prod` con `docker/.env.prod.example` (per esempio `APP_DB_PASSWORD`,
introdotta col ruolo a permessi minimi).

Gli script `docker/postgres/init/*.sql` girano **solo alla prima creazione del volume**. Un database
già in uso riceve le modifiche dello schema solo tramite i file in `docker/postgres/migrations/`.
Questi file sono idempotenti, quindi rieseguirne uno già applicato non fa danni.

Regola per chi sviluppa: ogni modifica agli script di init va accompagnata da una migrazione datata
in `docker/postgres/migrations/`.

## Sicurezza

- Il backend si collega al database con un ruolo a permessi minimi (`APP_DB_USER`): niente
  modifiche alla struttura, ai ruoli o ad altri database. `./bibliostack.sh prod up` lo crea o
  riallinea a ogni avvio; a mano: `./bibliostack.sh prod db-ruolo`.
- Tenere `docker/.env.prod` con permessi `600` e conservarne una copia sicura insieme ai backup.
  Il file è escluso da git.
- Esporre solo `web`: database, Redis e backend non hanno porte pubblicate.
- Aggiornare periodicamente il sistema operativo e Docker, poi `./bibliostack.sh prod up` per
  ricostruire le immagini.
- I backup contengono dati personali di studenti e personale: vedi [backup.md](backup.md).

## Problemi frequenti

| Sintomo | Causa probabile |
|---|---|
| Il login riesce ma la pagina torna subito al login | Il sito è aperto in HTTP: i cookie di sessione sono `Secure` (scenari A–D). |
| `backend` in riavvio continuo | `./bibliostack.sh prod logs backend`: di solito una variabile obbligatoria mancante (es. `ALLOWED_GOOGLE_DOMAINS`). |
| Certificato non ottenuto (scenario A) | DNS non ancora propagato o porta 80/443 chiusa: `./bibliostack.sh prod logs web`. |
| `prod up` fallisce con "port is already allocated" | La porta 80/443 è già usata da un altro servizio: scenario D. |
| Login bloccato per tutti insieme ("troppi tentativi") | Proxy davanti a Caddy senza `TRUSTED_PROXIES` e `TRUST_PROXY_HOPS=2` (scenario D). |
| Le email non arrivano | `./bibliostack.sh prod logs backend`: errore SMTP (credenziali, SMTP AUTH disattivato, `EMAIL_FROM` non autorizzato), oppure `Email quota reached`. Senza `SMTP_HOST` né `RESEND_API_KEY` le email non partono. |
| Il backend non si collega al database dopo l'aggiornamento | Manca `APP_DB_PASSWORD` in `docker/.env.prod`, o il ruolo non è stato creato: `./bibliostack.sh prod db-ruolo`. |
