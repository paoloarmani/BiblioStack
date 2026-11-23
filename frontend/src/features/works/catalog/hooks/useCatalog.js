import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/api/axios.js";

const LIMIT = 20;

export function useCatalog() {
    const [searchParams, setSearchParams] = useSearchParams()

    // Leggi i filtri dall'URL così sono shareable e persistenti
    const search      = searchParams.get("search")      ?? "";
    const genreId     = searchParams.get("genreId")     ?? "";
    const languageCode = searchParams.get("languageCode") ?? "";
    const publisherId = searchParams.get("publisherId") ?? "";
    const subjectId   = searchParams.get("subjectId")   ?? "";
    // Nome del soggetto passato dai link del dettaglio opera, solo per mostrarlo nel filtro
    const subjectName = searchParams.get("subjectName") ?? "";
    const page        = Number(searchParams.get("page") ?? 1);

    const [works, setWorks]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);

    const fetchWorks = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                search,
                page,
                limit: LIMIT,
                ...(genreId      && { genreId:      Number(genreId) }),
                ...(languageCode && { languageCode }),
                ...(publisherId  && { publisherId:  Number(publisherId) }),
                ...(subjectId    && { subjectId:    Number(subjectId) }),
            }
            const res = await api.get("/works/search", { params });
            setWorks(res.data);
            setHasMore(res.data.length === LIMIT);
        } catch {
            setWorks([]);
        } finally {
            setLoading(false);
        }
    }, [search, genreId, languageCode, publisherId, subjectId, page]);

    useEffect(() => {
        fetchWorks()
    }, [fetchWorks]);

    const setFilter = (key, value) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value) next.set(key, value);
            else next.delete(key);
            if (key === "subjectId") next.delete("subjectName"); // il nome arriva dal combobox
            next.set("page", "1"); // reset pagina quando cambia filtro
            return next;
        });
    };

    const setPage = (p) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set("page", String(p));
            return next;
        });
    };

    const clearFilters = () => {
        setSearchParams({ page: "1" });
    };

    const activeFiltersCount = [genreId, languageCode, publisherId, subjectId].filter(Boolean).length;

    return {
        works,
        loading,
        hasMore,
        page,
        search,
        filters: { genreId, languageCode, publisherId, subjectId, subjectName },
        activeFiltersCount,
        setFilter,
        setPage,
        clearFilters,
    };
}