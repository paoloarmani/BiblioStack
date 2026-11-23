-- Migrazione per database creati PRIMA di questi cambiamenti (gli script di init girano solo su un volume vuoto):
--   - rimozione della tabella roles (non più usata dopo l'enum user_role)
--   - codici paese in minuscolo, come li invia il frontend
--   - items.shelf_mark (collocazione, univoca) e items.loanable (prestito consentito)
--   - soggetti delle opere (subjects, work_subjects)
--   - item_availability: copie danneggiate prestabili, escluse smarrite e di sola consultazione
--
-- Idempotente: si può rieseguire senza danni. Prima di applicarla fare un backup:
--   ./bibliostack.sh prod backup && ./bibliostack.sh prod sql docker/postgres/migrations/2026-11-24_collocazione_prestito_soggetti.sql

BEGIN;
SET search_path TO school_library, public;

DROP TABLE IF EXISTS roles;

-- Paesi: minuscolo (works.publication_country segue grazie a ON UPDATE CASCADE)
ALTER TABLE publication_countries DROP CONSTRAINT IF EXISTS publication_countries_country_code_check;
UPDATE publication_countries SET country_code = lower(country_code) WHERE country_code <> lower(country_code);
ALTER TABLE publication_countries
    ADD CONSTRAINT publication_countries_country_code_check CHECK (country_code ~ '^[a-z]{2}$');

-- Copie: collocazione e prestito consentito
ALTER TABLE items ADD COLUMN IF NOT EXISTS shelf_mark text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS loanable boolean NOT NULL DEFAULT true;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_shelf_mark_key') THEN
        ALTER TABLE items ADD CONSTRAINT items_shelf_mark_key UNIQUE (shelf_mark);
    END IF;
END $$;

-- Soggetti
CREATE TABLE IF NOT EXISTS subjects (
    id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS work_subjects (
    work_id text NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    subject_id int NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (work_id, subject_id)
);

-- Disponibilità: stessa definizione di docker/postgres/init/003_views.sql
CREATE OR REPLACE VIEW item_availability AS
SELECT
    i.id          AS item_id,
    i.work_id,
    i.location_id
FROM items i
WHERE
    i.status <> 'lost' -- le copie danneggiate restano prestabili, quelle smarrite no
    AND i.loanable -- le copie di sola consultazione non sono mai prestabili né prenotabili
    AND NOT EXISTS (
        SELECT 1 FROM loans l
        WHERE l.item_id = i.id
          AND l.return_date IS NULL
    )
  AND
    NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.assigned_item_id = i.id
          AND r.status = 'ready'
    );

COMMIT;
