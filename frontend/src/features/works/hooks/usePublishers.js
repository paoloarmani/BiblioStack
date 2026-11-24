import { useState, useEffect } from "react";
import api from "@/api/axios.js"
import { notify } from "@/lib/notify.js";

export function usePublishers() {
    const [publishers, setPublishers] = useState([])
    const [loading, setLoading]       = useState(false)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                const { data } = await api.get("/publishers", { params: { limit: 100 } })
                setPublishers(data)
            } catch {
                notify.error("Impossibile caricare gli editori")
            }
            finally { setLoading(false) }
        }
        fetch()
    }, [])

    return { publishers, loading }
}