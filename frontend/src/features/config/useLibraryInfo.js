import { useEffect, useState } from "react";
import api from "@/api/axios.js";

// Caricata una sola volta per sessione: è la stessa per tutte le pagine
let request = null;
const loadLibraryInfo = () => {
    request ??= api.get("/config/public")
        .then(({ data }) => data.library)
        .catch(() => {
            request = null; // al prossimo montaggio si riprova
            return null;
        });
    return request;
};

// Informazioni pubbliche della biblioteca (nome, contatti, orari, link) configurate sul server
export function useLibraryInfo() {
    const [library, setLibrary] = useState(null);

    useEffect(() => {
        let active = true;
        loadLibraryInfo().then((data) => {
            if (active) setLibrary(data);
        });
        return () => { active = false; };
    }, []);

    return library;
}
