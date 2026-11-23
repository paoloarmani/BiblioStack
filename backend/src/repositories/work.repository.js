import { db } from "../db/connection.js";
import { works, authors, authorWorks, workGenres, items, loans, itemAvailability, subjects, workSubjects } from "../db/schema.js";
import { itemRepository } from "./item.repository.js";
import { eq, ilike, or, and, sql, asc, desc, count, ne, inArray } from "drizzle-orm";
import { normalizeSearch } from "../utils/search.util.js";
import { userSelect } from "./presets/user.preset.js";
import { RESERVATION_STATUS } from "../constants.js";

// Condizione "l'opera ha un soggetto che corrisponde al pattern": EXISTS evita di moltiplicare le righe con un join
const subjectMatch = (pattern) => sql`EXISTS (
    SELECT 1 FROM ${workSubjects} JOIN ${subjects} ON ${subjects.id} = ${workSubjects.subjectId}
    WHERE ${workSubjects.workId} = ${works.id} AND ${subjects.name} ILIKE ${pattern})`;

// Aggiunge a una lista di opere il numero di copie (non smarrite) e quante sono disponibili al prestito.
// Due query aggregate per tutta la pagina, invece di una per opera.
const withCopyCounts = async (list) => {
    if (list.length === 0) return list;
    const ids = list.map(w => w.id);
    const [totals, available] = await Promise.all([
        db.select({ workId: items.workId, n: count() }).from(items)
            .where(and(inArray(items.workId, ids), ne(items.status, "lost")))
            .groupBy(items.workId),
        db.select({ workId: itemAvailability.workId, n: count() }).from(itemAvailability)
            .where(inArray(itemAvailability.workId, ids))
            .groupBy(itemAvailability.workId)
    ]);
    const tot = new Map(totals.map(r => [r.workId, r.n]));
    const av = new Map(available.map(r => [r.workId, r.n]));
    return list.map(w => ({ ...w, copies: { total: tot.get(w.id) ?? 0, available: av.get(w.id) ?? 0 } }));
};

// Query base condivisa per findById e findByIdForStaff
const fetchWorkWithRelations = (id, { withLocation = false, withReservations = false } = {}, tx = db) =>
    tx.query.works.findFirst({
        where: { id },
        with: {
            authors: true,
            genres: true,
            subjects: { orderBy: { name: "asc" } },
            publisher: true,
            language: true,
            dewey: true,
            country: true,
            items: withLocation
                ? { with: { location: { with: { school: true } } } }
                : true,
            ...(withReservations && {
                activeReservations: {
                    where: { status: { in: [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.READY] } },
                    orderBy: { status: "asc", reservationDate: "asc" },
                    with: {
                        user: userSelect.mini,
                        assignedItem: { columns: { id: true } }
                    }
                }
            })
        }
    });


export const workRepository = {
    findAll: async ({ page, limit }) => {
        // Calcolo offset per la paginazione SQL
        const offset = (page - 1) * limit;

        const list = await db.query.works.findMany({
            limit: limit,
            offset: offset,
            orderBy: { title: "asc", id: "asc" }, // ordine stabile per la paginazione
            with: {
                authors: true,
                dewey: true
            }
        });
        return await withCopyCounts(list);
    },

    findById: async (id, tx = db) => {
        const [work, availableCount, counts] = await Promise.all([
            // Richiamo la query base senza passare with locations (quindi resta false e non lo ricevo)
            fetchWorkWithRelations(id, {}, tx),
            // Conto il numero di copie disponibili
            tx.$count(itemAvailability, eq(itemAvailability.workId, id)),
            itemRepository.countActiveByWorkId(id, tx)
        ]);

        if (!work) return null;
        return { ...work, availableCount, loanableCount: counts.loanable, referenceOnlyCount: counts.referenceOnly };
    },

    findByIdForStaff: async (id, tx = db) => {
        const [work, availableCount, availableIds, counts] = await Promise.all([
            // Chiamo la query base richiedendo anche la locazione
            fetchWorkWithRelations(id, { withLocation: true, withReservations: true }, tx),
            // Conto le copie disponibili
            tx.$count(itemAvailability, eq(itemAvailability.workId, id)),
            tx
                .select({ itemId: itemAvailability.itemId })
                .from(itemAvailability)
                .where(eq(itemAvailability.workId, id)),
            itemRepository.countActiveByWorkId(id, tx)
        ]);

        if (!work) return null;

        const availableSet = new Set(availableIds.map(r => r.itemId));

        return {
            ...work,
            availableCount,
            loanableCount: counts.loanable,
            referenceOnlyCount: counts.referenceOnly,
            items: work.items.map(item => ({
                ...item,
                available: availableSet.has(item.id)
            }))
        };
    },


    findNewest: async (limit) =>
        await db.query.works.findMany({
            limit: limit,
            orderBy: { publicationDate: "desc" },
            with: {
                authors: true,
                dewey: true
            }
        }),


    findMostLoaned: async (limit) => {
        // Recupera gli ID delle opere più prestate con il relativo conteggio
        const ranked = await db
            .select({
                id: works.id,
                loanCount: count(loans.id),
            })
            .from(works)
            .leftJoin(items, eq(items.workId, works.id))
            .leftJoin(loans, eq(loans.itemId, items.id))
            .groupBy(works.id)
            .orderBy(desc(count(loans.id)))
            .limit(limit);

        if (ranked.length === 0) return [];

        const ids = ranked.map(r => r.id);

        // Recupera i dati completi con le relazioni
        const fullWorks = await db.query.works.findMany({
            where: { id: { in: ids } },
            with: {
                authors: true,
                dewey: true,
            }
        });

        // Riordina secondo il ranking originale
        const workMap = new Map(fullWorks.map(w => [w.id, w]));
        return ranked.map(r => workMap.get(r.id)).filter(Boolean);
    },


    // Query per searchbar principale (navbar)
    search: async ({ search, page, limit, genreId, subjectId, languageCode, publisherId, deweyCode }) => {
        // Calcolo offset per la paginazione
        const offset = (page - 1) * limit;

        // Parsing di normalizzazione dell'input
        const { term, pattern, isEmpty } = normalizeSearch(search ?? "");

        // Subquery con assegnazione score per il ranking
        const ranked = db
            .selectDistinct({
                id: works.id,
                relevance: sql`
                CASE
                    WHEN ${works.id} = ${term}                                                      THEN 100
                    WHEN LOWER(${works.title}) = LOWER(${term})                                     THEN 90
                    WHEN LOWER(${authors.firstName} || ' ' || ${authors.lastName}) = LOWER(${term}) THEN 80
                    WHEN LOWER(${authors.lastName} || ' ' || ${authors.firstName}) = LOWER(${term}) THEN 80
                    WHEN ${works.title} ILIKE ${term + '%'}                                         THEN 75
                    WHEN LOWER(${authors.lastName}) = LOWER(${term})                                THEN 70
                    WHEN LOWER(${authors.firstName}) = LOWER(${term})                               THEN 65
                    WHEN ${works.title} ILIKE ${'%' + term + '%'}                                   THEN 60
                    WHEN ${authors.lastName} ILIKE ${'%' + term + '%'}                              THEN 50
                    WHEN ${authors.firstName} ILIKE ${'%' + term + '%'}                             THEN 45
                    WHEN ${subjectMatch(term)}                                                      THEN 40
                    WHEN ${subjectMatch('%' + term + '%')}                                          THEN 30
                    ELSE 10
                END
            `.as("relevance")
            })
            .from(works)
            .leftJoin(authorWorks, eq(authorWorks.workId, works.id))
            .leftJoin(authors, eq(authors.id, authorWorks.authorId))
            .leftJoin(workGenres, eq(workGenres.workId, works.id))
            .$dynamic();

        const searchConditions = isEmpty ? [] : [
            eq(works.id, term),
            ilike(works.title, pattern),
            ilike(authors.firstName, pattern),
            ilike(authors.lastName, pattern),
            sql`(${authors.firstName} || ' ' || ${authors.lastName}) ILIKE ${pattern}`,
            sql`(${authors.lastName} || ' ' || ${authors.firstName}) ILIKE ${pattern}`,
            subjectMatch(pattern),
        ];

        const filterConditions = [
            genreId      ? eq(workGenres.genreId, genreId)         : null,
            subjectId    ? sql`EXISTS (SELECT 1 FROM ${workSubjects} WHERE ${workSubjects.workId} = ${works.id} AND ${workSubjects.subjectId} = ${subjectId})` : null,
            languageCode ? eq(works.languageCode, languageCode)    : null,
            publisherId  ? eq(works.publisherId, publisherId)      : null,
            deweyCode    ? ilike(works.deweyCode, deweyCode + '%') : null,
        ].filter(Boolean);

        const allConditions = [
            searchConditions.length > 0 ? or(...searchConditions) : null,
            ...filterConditions,
        ].filter(Boolean);

        if (allConditions.length > 0) {
            ranked.where(and(...allConditions));
        }

        // CTE — ordina e pagina fuori dal DISTINCT
        const sq = ranked.as("ranked");

        const rankedIds = await db
            .select({ id: sq.id, relevance: sq.relevance })
            .from(sq)
            .orderBy(desc(sq.relevance), asc(sq.id))
            .limit(limit)
            .offset(offset);

        if (rankedIds.length === 0) return [];

        // Fetch completo con relazioni
        const ids = rankedIds.map(r => r.id);

        const fullWorks = await db.query.works.findMany({
            where: { id: { in: ids } },
            with: {
                authors: true,
                publisher: true,
                language: true,
                dewey: true,
            }
        });

        // Riordino secondo ranking originale
        const workMap = new Map(fullWorks.map(w => [w.id, w]));
        return await withCopyCounts(rankedIds.map(r => workMap.get(r.id)).filter(Boolean));
    },

    create: async (data) =>
        await db
            .insert(works)
            .values(data)
            .returning(),

    update: async (id, data) =>
        await db
            .update(works)
            .set(data)
            .where(eq(works.id, id))
            .returning(),

    delete: async (id) =>
        await db
            .delete(works)
            .where(eq(works.id, id))
            .returning()
}