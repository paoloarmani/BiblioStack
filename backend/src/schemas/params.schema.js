import { z } from "zod";

/*
    Formati dei parametri passati nell'URL (/:id, /:code, ...). Ogni chiave primaria ha il suo:
    oltre agli id interi ci sono codici testuali (opere = ISBN o codice di catalogo "M-...",
    copie = numero di inventario, lingue, valute, Dewey). Gli stessi formati sono usati negli
    schemi di creazione, così ogni id salvato è anche un parametro URL valido.
*/

// Codice testuale (id di opere e copie): 1-64 caratteri stampabili, senza spazi in testa o in coda.
// Volutamente permissivo: i numeri di inventario reali contengono spazi e barre ("77 CS", "1966/BIS")
// e alcuni id importati iniziano col trattino. Esclusi i caratteri di controllo (a capo, NUL, ...).
export const CODE_PATTERN = /^\S(?:[^\p{Cc}]{0,62}\S)?$/u;
// Classificazione Dewey (es. 853.914, 346.4538504502632): cifre, lettere, punto, barra, trattino
export const DEWEY_PATTERN = /^[0-9A-Za-z./-](?:[0-9A-Za-z ./-]{0,30}[0-9A-Za-z./-])?$/;

const PG_INT_MAX = 2_147_483_647;
const PG_SMALLINT_MAX = 32_767;

// Solo cifre (niente "1e3", "0x10", " 7", "1.0"), poi conversione e controllo dell'intervallo
const positiveIntUpTo = (max) => z.string().regex(/^[0-9]{1,10}$/).transform(Number).pipe(z.number().int().min(1).max(max));

export const ParamSchemas = {
    // int: tabelle con id "int" (utenti, prestiti, prenotazioni, autori, soggetti, ...)
    int: positiveIntUpTo(PG_INT_MAX),
    // smallint: generi, editori, contributi, tipi di segnalazione (oltre 32767 Postgres darebbe errore 500)
    smallint: positiveIntUpTo(PG_SMALLINT_MAX),
    // opere e copie
    code: z.string().regex(CODE_PATTERN),
    dewey: z.string().regex(DEWEY_PATTERN),
    // ISO 639-2 (ita), ISO 4217 (EUR), ISO 3166-1 alpha-2 (it)
    language: z.string().regex(/^[A-Za-z]{3}$/),
    currency: z.string().regex(/^[A-Za-z]{3}$/),
    country: z.string().regex(/^[A-Za-z]{2}$/),
    // ISBN-10/13, con o senza trattini
    isbn: z.string().regex(/^[0-9Xx-]{10,17}$/),
};
