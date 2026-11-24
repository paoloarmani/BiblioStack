import { z } from 'zod';
import { CODE_PATTERN } from "./params.schema.js";

// Collocazione completa della copia (es. "A1 I 3"): univoca, stringa vuota trattata come assente
const ShelfMarkSchema = z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(64).nullable().optional()
);

// Schema di validazione dei dati per la creazione di una copia
export const CreateItemSchema = z.object({
    id:              z.string().trim().regex(CODE_PATTERN, "Invalid item id"),
    workId:          z.string().min(1, "workId is required"),
    locationId:      z.number().int().positive().optional().nullable(),
    shelfMark:       ShelfMarkSchema,
    loanable:        z.boolean().optional(), // false = prestito non consentito (solo consultazione)
    currencyCode:    z.string().length(3).optional().nullable(),
    acquisitionDate: z.coerce.date().optional().nullable(),
    price:           z.coerce.number().positive().optional().nullable()
});

// Schema di supporto per la validazione dello stato di una copia
export const ItemStatusSchema = z.enum([
    "active",
    "damaged",
    "lost"
]);

// Schema di validazione dei dati per la modifica della posizione, valuta, data di acquisizione, prezzo e stato di una copia
export const UpdateItemSchema = z.object({
    locationId:      z.number().int().positive().optional().nullable(),
    shelfMark:       ShelfMarkSchema,
    loanable:        z.boolean().optional(),
    currencyCode:    z.string().length(3).optional().nullable(),
    acquisitionDate: z.coerce.date().optional().nullable(),
    price:           z.coerce.number().positive().optional().nullable(),
    status: ItemStatusSchema.optional()
});