# Backup e ripristino

## Cosa salvare

| Cosa | Dove | Importanza |
|---|---|---|
| **Database** | volume `pgdata` (servizio `db`) | **Essenziale**: catalogo, copie, utenti, prestiti, prenotazioni, storico. |
| **Configurazione** | `docker/.env.prod` | **Essenziale**: senza `CARD_SECRET` le tessere stampate non funzionano più; senza `JWT_*` tutti devono rifare il login. Contiene password: va conservata cifrata. |
| Certificati HTTPS | volume `caddy_data` | Facoltativo: Caddy li riottiene da solo. Utile salvarlo nello scenario B (autorità interna già installata sui PC). |
| Redis | volume `redisdata` | Non serve: contiene solo sessioni e contatori temporanei. Dopo un ripristino gli utenti rifanno il login. |

Il codice non va salvato: è nel repository git.

## Backup manuale

```bash
./bibliostack.sh prod backup                          # → backups/bibliostack-AAAA-MM-GG_HHMM.sql.gz
./bibliostack.sh prod backup /mnt/nas/bibliostack.sql.gz
```

- È un dump SQL compresso del database, fatto a caldo: non serve fermare l'app e il dump è coerente.
- Il comando controlla che il dump sia completo prima di salvarlo; un dump troncato non sostituisce
  un file esistente.
- La cartella `backups/` è esclusa da git.
- In sviluppo lo stesso comando è `./bibliostack.sh backup`.

## Backup automatico (cron)

Esempio: backup ogni notte alle 2:30, conservazione 30 giorni, log in `backups/backup.log`.

```bash
crontab -e
```

```cron
30 2 * * * cd /opt/bibliostack && ./bibliostack.sh prod backup >> backups/backup.log 2>&1 && find backups -name 'bibliostack-*.sql.gz' -mtime +30 -delete
```

- Sostituire `/opt/bibliostack` con la cartella del repository.
- L'utente del cron deve poter usare Docker (gruppo `docker`, oppure utente root).
- Controllare ogni tanto `backups/backup.log`: un `❌` indica un backup non riuscito.

## Copia fuori dal server

Un backup che resta solo sul server non protegge da un guasto del disco o da un ransomware. Conviene
la regola **3-2-1**: tre copie, su due supporti diversi, di cui una fuori sede. Per esempio, dopo il
backup notturno:

```cron
45 2 * * * rsync -a /opt/bibliostack/backups/ backup@nas.scuola.lan:/volume1/bibliostack/
```

In alternativa `rclone` verso un cloud della scuola. Se la copia esce dalla rete della scuola,
cifrarla prima:

```bash
gpg --symmetric --cipher-algo AES256 backups/bibliostack-2026-11-24_0230.sql.gz
```

Conservare insieme ai backup, ma separata e cifrata, anche una copia di `docker/.env.prod`.

## Ripristino

```bash
./bibliostack.sh prod restore backups/bibliostack-2026-11-24_0230.sql.gz
```

1. Il comando chiede conferma: con `--si` la salta, utile negli script.
2. Ferma il backend.
3. Sostituisce **tutti** i dati attuali con quelli del backup, in un'unica transazione: se qualcosa
   va storto il database resta com'era.
4. Svuota le sessioni in Redis e riavvia il backend. Gli utenti dovranno rifare il login.

Prima di un ripristino conviene salvare lo stato attuale con `./bibliostack.sh prod backup`.

### Ripristino su un server nuovo (disaster recovery)

1. Installare Docker e clonare il repository (vedi [produzione.md](produzione.md)).
2. Rimettere al suo posto `docker/.env.prod`, **quello originale**: stessi segreti, così le tessere
   continuano a funzionare.
3. `./bibliostack.sh prod up`: crea un database vuoto con lo schema attuale.
4. `./bibliostack.sh prod restore /percorso/ultimo-backup.sql.gz --si`
5. Se il backup è di una versione precedente, applicare le migrazioni successive in
   `docker/postgres/migrations/` con `./bibliostack.sh prod sql <file>`.

## Verificare che i backup funzionino

Un backup mai provato non è un backup. Una volta ogni tanto conviene ripristinare l'ultimo backup
di produzione in un ambiente di sviluppo e controllare che i dati ci siano:

```bash
./bibliostack.sh up
./bibliostack.sh restore /percorso/backup-di-produzione.sql.gz --si
```

Il database di sviluppo viene sostituito; dopo la prova `./bibliostack.sh reset` lo riporta ai dati
di esempio.

## Privacy

I backup contengono dati personali di studenti e personale: nomi, email, storico dei prestiti.

- Conservarli in luoghi ad accesso ristretto e cifrarli se escono dalla scuola.
- Rispettare i tempi di conservazione previsti dalla scuola: la regola `-mtime +30` del cron
  cancella le copie locali più vecchie di 30 giorni, mentre per le copie esterne va prevista
  una regola analoga.
