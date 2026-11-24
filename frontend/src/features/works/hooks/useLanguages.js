import { useState, useEffect } from "react";
import api from "@/api/axios.js"
import { notify } from "@/lib/notify.js";

export function useLanguages() {
    const [languages, setLanguages] = useState([])
    const [loading, setLoading]     = useState(false)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                const { data } = await api.get("/languages", { params: { limit: 100 } })
                setLanguages(data)
            } catch {
                notify.error("Impossibile caricare le lingue")
            }
            finally { setLoading(false) }
        }
        fetch()
    }, [])

    return { languages, loading }
}