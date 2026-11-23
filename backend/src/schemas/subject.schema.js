import { z } from 'zod';

// Schema di validazione dei dati per la creazione di un soggetto (ID generato dal database)
export const CreateSubjectSchema = z.object({
    name: z.string().trim().min(1).max(255)
});

// Schema di validazione dei dati per la modifica di un soggetto
export const UpdateSubjectSchema = CreateSubjectSchema.partial();

// Filtro facoltativo per la lista (es. autocompletamento): GET /subjects?search=urban
export const SubjectSearchSchema = z.object({
    search: z.string().trim().max(100).optional()
});
