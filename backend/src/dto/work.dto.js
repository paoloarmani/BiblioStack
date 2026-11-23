import { z } from 'zod';
import { AuthorDTO, UserMiniDTO } from "./shared.dto.js";
import { WorkExternalDTO } from "../features/worksExternal/worksExternal.mapper.js";
import { LocationBaseDTO } from "./location.dto.js";
import { ItemStatusSchema } from "../schemas/item.schema.js";

/* ---------------- COMMON ---------------- */

const GenreSchema = z.object({
    id: z.number(),
    name: z.string()
});

const SubjectSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ItemStaffSchema = z.object({
    id: z.string(),
    shelfMark: z.string().nullable(),
    loanable: z.boolean(),
    price: z.coerce.number().nullable(),
    acquisitionDate: z.date().nullable(),
    location: LocationBaseDTO.nullable(),
    status: ItemStatusSchema,
    available: z.boolean()
});

const PublisherSchema = z.object({
    id: z.number(),
    name: z.string()
});

const LanguageSchema = z.object({
    languageCode: z.string(),
    name: z.string()
});

const DeweySchema = z.object({
    code: z.string(),
    description: z.string().nullable()
});

const PublicationCountrySchema = z.object({
    countryCode: z.string(),
    name: z.string()
});

const ActiveReservationsSchema = z.object({
    id: z.number(),
    status: z.enum(["pending", "ready"]),
    reservationDate: z.date(),
    expiresAt: z.date().nullable(),
    user: UserMiniDTO,
    assignedItem: z.object({ id: z.string()}).nullable(),

})

/* ---------------- CORE ---------------- */

const WorkCore = {
    id: z.string(),
    title: z.string(),
    publicationDate: z.date().nullable().optional()
};

const WorkDetailCommon = {
    ...WorkCore,
    otherTitleInformation: z.string().nullable().optional(),
    authors: z.array(AuthorDTO).default([]),
    genres: z.array(GenreSchema).default([]),
    subjects: z.array(SubjectSchema).default([]),
    publisher: PublisherSchema.nullable().optional(),
    language: LanguageSchema.nullable().optional(),
    dewey: DeweySchema.nullable().optional(),
    availableCount: z.number().default(0),
    // Copie attive prestabili (anche se ora in prestito) e copie di sola consultazione
    loanableCount: z.number().default(0),
    referenceOnlyCount: z.number().default(0),
    coverUrl: z.string().nullable().optional(),
    description: z.string().nullable().optional()
};


/* ---------------- BASE ---------------- */

// Copie non smarrite e quante sono disponibili al prestito (liste e ricerca)
const CopiesSummarySchema = z.object({
    total: z.number(),
    available: z.number()
});

export const WorkBaseDTO = z.object({
    ...WorkCore,
    copies: CopiesSummarySchema.optional(),
    coverUrl: z.string().optional().nullable(),
    authors: z.array(AuthorDTO).default([])
});

export const WorkBaseListDTO = z.array(WorkBaseDTO);

/* ---------------- DETAIL ---------------- */

// Utente base: niente prezzo, niente locazione, niente data acquisto
// Copie viste dall'utente: dove trovarle e se si possono prendere in prestito (niente prezzo né date)
const ItemPublicSchema = z.object({
    id: z.string(),
    shelfMark: z.string().nullable(),
    loanable: z.boolean(),
    status: ItemStatusSchema
});

export const WorkDetailDTO = z.object({
    ...WorkDetailCommon,
    items: z.array(ItemPublicSchema).default([])
});

// Staff: stesso oggetto + dettagli sulle copie + coda di prenotazioni attive (ready e pending)
export const WorkDetailStaffDTO = z.object({
    ...WorkDetailCommon,
    pages: z.number().nullable().optional(),
    country: PublicationCountrySchema.nullable().optional(),
    items: z.array(ItemStaffSchema).default([]),
    activeReservations: z.array(ActiveReservationsSchema).default([])
});



// DTO ottimizzato per la lista risultati search
export const WorkSearchResultDTO = z.object({
    id: z.string(),
    copies: CopiesSummarySchema.optional(),
    title: z.string(),
    publicationDate: z.date().nullable(),
    authors: z.array(AuthorDTO).default([]),
    publisher: PublisherSchema.nullable().optional(),
    language: LanguageSchema.nullable().optional(),
    dewey: DeweySchema.nullable().optional(),
    coverUrl: z.string().optional().nullable()
});

export const WorkSearchResultListDTO = z.array(WorkSearchResultDTO);

// DTO per determinare se l'opera è stata trovata internamente o tramite api esterne
export const WorkLookupDTO = z.discriminatedUnion("source", [
    z.object({
        source: z.literal("internal"),
        work: WorkDetailDTO
    }),
    z.object({
        source: z.literal("external"),
        work: WorkExternalDTO
    })
]);