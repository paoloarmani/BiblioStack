import { useEffect, useState } from "react";

/**
 * Ricerca lato server con debounce, per i combobox con suggerimenti (utenti, soggetti...).
 * fetcher(term) => Promise<array>: deve essere stabile (definita fuori dal componente o con useCallback).
 * Le risposte arrivate dopo un nuovo input vengono scartate, così l'elenco non "salta" indietro.
 */
export function useDebouncedSearch(fetcher, delay = 250) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const query = term.trim();
        if (!query) return; // svuotamento gestito in search()

        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await fetcher(query);
                if (!cancelled) setResults(data);
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, delay);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [term, fetcher, delay]);

    const search = (value) => {
        setTerm(value);
        if (!value.trim()) {
            setResults([]);
            setLoading(false);
        }
    };

    const clear = () => search("");

    return { term, search, clear, results, loading };
}
