import { useState, useEffect } from "react";
import api from "@/api/axios.js"
import { notify } from "@/lib/notify.js";

export function useDeweyCodes() {
    const [codes, setCodes]     = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            try {
                const { data } = await api.get("/dewey-codes", { params: { limit: 1000 } })
                setCodes(data)
            } catch {
                notify.error("Impossibile caricare i codici Dewey")
            }
            finally { setLoading(false) }
        }
        fetch()
    }, [])

    return { codes, loading }
}