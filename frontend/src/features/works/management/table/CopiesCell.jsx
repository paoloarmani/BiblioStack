// Riepilogo copie di un'opera nella tabella di gestione: disponibili al prestito su totali (non smarrite)
export default function CopiesCell({ copies }) {
    if (!copies) return <span className="text-sm text-muted-foreground">—</span>;
    if (copies.total === 0) return <span className="text-sm text-muted-foreground">Nessuna copia</span>;
    const ok = copies.available > 0;
    return (
        <span className="flex items-center gap-2 whitespace-nowrap text-sm">
            <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-success" : "bg-destructive"}`} />
            <span>
                <span className="font-medium">{copies.available}</span>
                <span className="text-muted-foreground"> disponibil{copies.available === 1 ? "e" : "i"} su {copies.total}</span>
            </span>
        </span>
    );
}
