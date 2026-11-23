import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios.js";
import { handleApiError } from "@/lib/handleApiError.js";

// L'API è paginata (max 50 per pagina): per i menu di scelta servono tutti gli scaffali
const PAGE_SIZE = 50;
export async function fetchAllLocations() {
    const all = [];
    for (let page = 1; ; page++) {
        const { data } = await api.get("/locations", { params: { page, limit: PAGE_SIZE } });
        all.push(...data);
        if (data.length < PAGE_SIZE) return all;
    }
}

export function useLocations(enabled = true) {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!enabled) return;

        const fetchLocations = async () => {
            setLoading(true);
            try {
                setLocations(await fetchAllLocations());
            } catch (err) {
                handleApiError(err, navigate);
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
    }, [enabled, navigate]);

    return { locations, loading };
}