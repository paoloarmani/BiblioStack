import { useState } from "react"

// Stato aperto/chiuso della barra di ricerca su mobile
export function useMobileSearch() {
    const [open, setOpen] = useState(false)
    const toggle = () => setOpen(prev => !prev)
    return { open, toggle }
}
