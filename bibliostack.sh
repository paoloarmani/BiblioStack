#!/usr/bin/env bash
# Gestione dello stack di sviluppo BiblioStack interamente in Docker.
# Requisito unico sull'host: Docker con il plugin "docker compose".
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT/docker/compose.dev.yml"
ENV_FILE="$ROOT/docker/.env.dev"

compose() {
    local args=(-f "$COMPOSE_FILE")
    [[ -f "$ENV_FILE" ]] && args+=(--env-file "$ENV_FILE")
    docker compose "${args[@]}" "$@"
}

# Stack di produzione (docker/compose.prod.yml + docker/.env.prod obbligatorio)
PROD_COMPOSE_FILE="$ROOT/docker/compose.prod.yml"
PROD_ENV_FILE="$ROOT/docker/.env.prod"
compose_prod() {
    [[ -f "$PROD_ENV_FILE" ]] || {
        echo "❌ Manca docker/.env.prod: cp docker/.env.prod.example docker/.env.prod e compilarlo" >&2
        exit 1
    }
    docker compose -f "$PROD_COMPOSE_FILE" --env-file "$PROD_ENV_FILE" "$@"
}

# Crea un utente amministratore (password chiesta a terminale, mai sulla riga di comando).
# $1 = funzione compose da usare (compose | compose_prod), $2 = email
create_admin() {
    local run="$1" email="${2:?Specificare l'email dell'amministratore}" pass
    read -r -s -p "Password per $email (min. 8 caratteri, maiuscola, numero, simbolo): " pass; echo
    "$run" exec -T -e ADMIN_EMAIL="$email" -e ADMIN_PASSWORD="$pass" backend node --input-type=module -e "
import { hashPassword } from './src/utils/password.util.js';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(\"INSERT INTO school_library.users (role, first_name, last_name, email, password_hash) VALUES ('admin', 'Admin', 'Biblioteca', \$1, \$2) ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = EXCLUDED.password_hash, deleted_at = NULL\",
    [process.env.ADMIN_EMAIL, await hashPassword(process.env.ADMIN_PASSWORD)]);
await c.end();
console.log('✅ Amministratore pronto: ' + process.env.ADMIN_EMAIL);"
}

# Esegue un file SQL (es. il pacchetto del catalogo storico) sul database dello stack indicato
run_sql_file() {
    local run="$1" file="${2:?Specificare il file .sql}"
    [[ -f "$file" ]] || { echo "❌ File non trovato: $file" >&2; exit 1; }
    "$run" exec -T db sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
    echo "✅ Importato: $file"
}

# Legge una variabile da docker/.env.dev con fallback al default
env_or_default() {
    local name="$1" default="$2" value=""
    [[ -f "$ENV_FILE" ]] && value="$(grep -E "^${name}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
    echo "${value:-$default}"
}

usage() {
    cat <<EOF
Uso: ./bibliostack.sh <comando> [argomenti]

Avvio e arresto
  up              Costruisce le immagini e avvia tutto in background
  down            Ferma e rimuove i container (i dati del DB restano)
  restart [svc]   Riavvia tutti i servizi o solo quello indicato
  ps              Stato dei container
  logs [svc]      Segue i log (es. logs backend)

Dati
  seed            Carica i dati di esempio (solo su database vuoto)
  reset           CANCELLA il database, lo ricrea dagli script SQL e ricarica il seed
  admin <email>   Crea (o ripristina) un amministratore; la password viene chiesta a terminale
  import-catalogo <file.sql>
                  Importa un catalogo (es. quello storico) su un database SENZA seed

Strumenti
  smoke           Esegue uno smoke test delle API (login admin, catalogo, ruoli...)
  lint            ESLint sul frontend
  build           Build di produzione del frontend (verifica che compili)
  psql            Shell SQL sul database
  redis           redis-cli autenticato
  sh <svc>        Shell dentro un container (backend|frontend|db|redis)
  npm <svc> ...   Esegue npm nel container (es. npm backend install pino)

Produzione (docker/compose.prod.yml, configurazione in docker/.env.prod)
  prod up         Costruisce le immagini compilate e avvia lo stack (HTTPS con Caddy)
  prod down       Ferma lo stack (i dati restano nei volumi)
  prod ps|logs    Stato dei container / log
  prod admin <email>            Crea un amministratore
  prod import-catalogo <file>   Importa un catalogo sul database di produzione
  prod backup [file]            Dump compresso del database (default: backup-AAAA-MM-GG.sql.gz)
  prod psql       Shell SQL sul database di produzione

Dopo "up":  frontend http://localhost:$(env_or_default FRONTEND_HOST_PORT 5173)
            backend  http://localhost:$(env_or_default BACKEND_HOST_PORT 5001)
EOF
}

wait_backend() {
    echo "⏳ Attendo che il backend risponda..."
    for _ in $(seq 1 60); do
        if compose exec -T backend node -e "fetch('http://localhost:5001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
            echo "✅ Backend pronto"
            return 0
        fi
        sleep 2
    done
    echo "❌ Il backend non risponde: controlla './bibliostack.sh logs backend'" >&2
    return 1
}

cmd="${1:-help}"
shift || true

case "$cmd" in
    up)
        # -V ricrea i volumi anonimi di node_modules, così riflettono sempre le dipendenze dell'immagine
        compose up -d --build -V "$@"
        wait_backend
        echo
        echo "Frontend: http://localhost:$(env_or_default FRONTEND_HOST_PORT 5173)"
        echo "Backend:  http://localhost:$(env_or_default BACKEND_HOST_PORT 5001)"
        echo "Primo avvio? Esegui './bibliostack.sh seed' per i dati di esempio."
        ;;
    down)     compose down "$@" ;;
    restart)  compose restart "$@" ;;
    ps)       compose ps "$@" ;;
    logs)     compose logs -f --tail=200 "$@" ;;
    seed)
        compose exec -T backend node src/db/seed.js
        ;;
    reset)
        read -r -p "⚠️  Il database e Redis verranno cancellati. Continuare? [s/N] " answer
        [[ "$answer" =~ ^[sSyY]$ ]] || { echo "Annullato."; exit 0; }
        compose down -v
        compose up -d --build -V
        wait_backend
        compose exec -T backend node src/db/seed.js
        ;;
    smoke)
        compose exec -T backend node scripts/smoke-test.mjs
        ;;
    lint)     compose exec -T frontend npm run lint ;;
    build)    compose exec -T frontend npm run build ;;
    psql)
        compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
        ;;
    redis)    compose exec redis redis-cli ;;
    sh)
        svc="${1:?Specificare il servizio: backend|frontend|db|redis}"
        compose exec "$svc" sh
        ;;
    npm)
        svc="${1:?Specificare il servizio: backend|frontend}"; shift
        compose exec "$svc" npm "$@"
        ;;
    admin)    create_admin compose "${1:-}" ;;
    import-catalogo) run_sql_file compose "${1:-}" ;;
    prod)
        sub="${1:-help}"; shift || true
        case "$sub" in
            up)
                compose_prod up -d --build
                echo "✅ Avviato. Indirizzo: $(grep -E '^PUBLIC_URL=' "$PROD_ENV_FILE" | cut -d= -f2-)"
                echo "Primo avvio? './bibliostack.sh prod admin <email>' per creare l'amministratore."
                ;;
            down)   compose_prod down ;;
            ps)     compose_prod ps ;;
            logs)   compose_prod logs -f --tail=200 "$@" ;;
            admin)  create_admin compose_prod "${1:-}" ;;
            import-catalogo) run_sql_file compose_prod "${1:-}" ;;
            backup)
                out="${1:-backup-$(date +%F).sql.gz}"
                compose_prod exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$out"
                echo "✅ Backup salvato in $out"
                ;;
            psql)   compose_prod exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' ;;
            *)      echo "Uso: ./bibliostack.sh prod up|down|ps|logs|admin|import-catalogo|backup|psql" >&2; exit 1 ;;
        esac
        ;;
    help|-h|--help) usage ;;
    *)
        echo "Comando sconosciuto: $cmd" >&2
        usage
        exit 1
        ;;
esac
