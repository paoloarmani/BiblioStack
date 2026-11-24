#!/bin/sh
# Ruolo con cui il BACKEND si collega al database: solo lettura/scrittura dei dati
# (SELECT, INSERT, UPDATE, DELETE), nessun permesso su struttura, ruoli o altri database.
# Struttura, migrazioni, import e backup restano al proprietario (POSTGRES_USER).
#
# Gira da solo alla prima creazione del volume (docker-entrypoint-initdb.d) ed è idempotente:
# bibliostack.sh lo riesegue a ogni "up" e dopo un "restore", così vale anche per database
# creati prima che esistesse e riallinea la password a APP_DB_PASSWORD.
set -eu

if [ -z "${APP_DB_USER:-}" ] || [ -z "${APP_DB_PASSWORD:-}" ]; then
    echo "005_app_role: APP_DB_USER/APP_DB_PASSWORD non impostati, ruolo applicativo non creato" >&2
    exit 0
fi

# La password è letta dall'ambiente con \getenv: non compare sulla riga di comando né viene
# interpolata dalla shell nel testo SQL
psql -v ON_ERROR_STOP=1 -q --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_user APP_DB_USER
\getenv app_pass APP_DB_PASSWORD
\getenv owner POSTGRES_USER

SELECT format('CREATE ROLE %I LOGIN', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',
              :'app_user', :'app_pass') \gexec

-- Il search_path (school_library, public) è impostato a livello di database e vale anche per questo ruolo
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('REVOKE CREATE ON SCHEMA public FROM %I', :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA school_library, public TO %I', :'app_user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA school_library TO %I', :'app_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA school_library TO %I', :'app_user') \gexec

-- Tabelle e sequenze create in futuro dal proprietario (migrazioni) ricevono gli stessi permessi
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA school_library GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
              :'owner', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA school_library GRANT USAGE, SELECT ON SEQUENCES TO %I',
              :'owner', :'app_user') \gexec
SQL

echo "005_app_role: ruolo applicativo \"$APP_DB_USER\" pronto"
