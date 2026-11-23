import { z } from "zod";

export const editItemSchema = z.object({
    locationId: z.number().nullable(),
    shelfMark: z.string().trim().max(64, "Massimo 64 caratteri").nullable(),
    notLoanable: z.boolean(),
    currencyCode: z.string().nullable(),
    acquisitionDate: z.string().nullable(),
    price: z.coerce.number().nullable(),
    status: z.enum(["active", "damaged", "lost"])
});