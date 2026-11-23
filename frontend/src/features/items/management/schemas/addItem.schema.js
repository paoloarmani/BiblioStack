import { z } from "zod";

export const addItemSchema = z.object({
    id:              z.string().min(1, "ID obbligatorio"),
    locationId:      z.coerce.number().int().positive().optional().nullable(),
    shelfMark:       z.string().trim().max(64, "Massimo 64 caratteri").optional().nullable(),
    currencyCode:    z.string().length(3).optional().nullable(),
    acquisitionDate: z.string().optional().nullable(),
    price:           z.coerce.number().nonnegative("Il prezzo deve essere positivo").optional().nullable(),
});