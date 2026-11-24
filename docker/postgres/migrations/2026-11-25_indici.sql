-- Migrazione per database creati PRIMA di questi indici (gli script di init girano solo su un volume vuoto).
-- Idempotente. Applicarla con:
--   ./bibliostack.sh prod backup && ./bibliostack.sh prod sql docker/postgres/migrations/2026-11-25_indici.sql
-- La creazione blocca le scritture sulle tabelle per pochi secondi: meglio a biblioteca chiusa.

BEGIN;
SET search_path TO school_library, public;

-- Trigrammi: rendono indicizzabili le ricerche ILIKE '%testo%' (catalogo, autori, soggetti, editori, utenti)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE INDEX IF NOT EXISTS works_title_trgm_idx        ON works      USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS authors_last_name_trgm_idx  ON authors    USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS authors_first_name_trgm_idx ON authors    USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS subjects_name_trgm_idx      ON subjects   USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS publishers_name_trgm_idx    ON publishers USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_last_name_trgm_idx    ON users      USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_first_name_trgm_idx   ON users      USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_email_trgm_idx        ON users      USING gin (email gin_trgm_ops);

-- Opere e relazioni
CREATE INDEX IF NOT EXISTS works_publisher_id_idx        ON works (publisher_id);
CREATE INDEX IF NOT EXISTS works_publication_date_idx    ON works (publication_date DESC);
CREATE INDEX IF NOT EXISTS author_works_work_id_idx      ON author_works (work_id);
CREATE INDEX IF NOT EXISTS work_genres_genre_id_idx      ON work_genres (genre_id);
CREATE INDEX IF NOT EXISTS work_subjects_subject_id_idx  ON work_subjects (subject_id);

-- Copie
CREATE INDEX IF NOT EXISTS items_work_id_idx     ON items (work_id);
CREATE INDEX IF NOT EXISTS items_location_id_idx ON items (location_id);

-- Prestiti: storico per utente e per copia, prestiti aperti per scadenza (avvisi e ritardi)
CREATE INDEX IF NOT EXISTS loans_user_id_loan_date_idx ON loans (user_id, loan_date DESC);
CREATE INDEX IF NOT EXISTS loans_item_id_idx           ON loans (item_id);
CREATE INDEX IF NOT EXISTS loans_open_due_date_idx     ON loans (due_date) WHERE return_date IS NULL;

-- Prenotazioni
CREATE INDEX IF NOT EXISTS reservations_work_id_status_idx  ON reservations (work_id, status);
CREATE INDEX IF NOT EXISTS reservations_user_id_idx         ON reservations (user_id, reservation_date DESC);
CREATE INDEX IF NOT EXISTS reservations_assigned_item_idx   ON reservations (assigned_item_id) WHERE assigned_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reservations_ready_expires_idx   ON reservations (expires_at) WHERE status = 'ready';

-- Notifiche, segnalazioni, sospensioni
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notices_loan_id_idx            ON notices (loan_id);
CREATE INDEX IF NOT EXISTS notices_user_id_idx            ON notices (user_id);
CREATE INDEX IF NOT EXISTS suspensions_user_id_idx        ON suspensions (user_id, end_date);

COMMIT;

ANALYZE;
