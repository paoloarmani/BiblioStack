import { db } from "../db/connection.js";
import { subjects } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const subjectRepository = {
    findAll: async ({ page, limit, search }) => {
        // Calcolo offset per la paginazione
        const offset = (page - 1) * limit;

        return await db.query.subjects.findMany({
            ...(search && { where: { name: { ilike: `%${search}%` } } }),
            offset: offset,
            limit: limit,
            orderBy: { name: "asc" }
        });
    },

    // Ricerca paginata per i combobox: carica un record in più per sapere se c'è un'altra pagina
    search: async ({ page, limit, search }) => {
        const list = await db.query.subjects.findMany({
            ...(search && { where: { name: { ilike: `%${search}%` } } }),
            offset: (page - 1) * limit,
            limit: limit + 1,
            orderBy: { name: "asc" }
        });
        return { data: list.slice(0, limit), hasMore: list.length > limit };
    },

    findById: async (id) =>
        await db.query.subjects.findFirst({
            where: { id: id }
        }),

    create: async (data) =>
        await db.insert(subjects).values(data).returning(),

    update: async (id, data) =>
        await db.update(subjects).set(data).where(eq(subjects.id, id)).returning(),

    delete: async (id) =>
        await db.delete(subjects).where(eq(subjects.id, id)).returning()
};
