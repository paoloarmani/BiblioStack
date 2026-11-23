import { School, MapPin, Bookmark } from "lucide-react";
import { ItemTableActions } from "@/features/items/management/components/ItemTableActions.jsx";

function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function formatPrice(price) {
    if (price == null) return "—";
    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
    }).format(price);
}

export const getStaffItemsColumns = ({ isAdmin = false, work, onEdit, onDelete } = {}) => {
    const columns = [
        {
            accessorKey: "available",
            header: "Stato",
            cell: ({ row, getValue }) => {
                const available = getValue();
                if (row.original.status === "lost") {
                    return (
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            <span className="text-xs text-muted-foreground">Smarrita</span>
                        </div>
                    );
                }
                if (row.original.loanable === false) {
                    return (
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Solo consultazione</span>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${available ? "bg-success" : "bg-destructive"}`} />
                        <span className="text-xs text-muted-foreground">
                            {available ? "Disponibile" : "Non disponibile"}
                            {row.original.status === "damaged" && " · danneggiata"}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "id",
            header: "Codice inventario",
            cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
        },
        {
            accessorKey: "shelfMark",
            header: "Collocazione",
            cell: ({ getValue }) => (
                <span className="flex items-center gap-1 font-mono text-sm">
                    <Bookmark className="h-3.5 w-3.5" />
                    {getValue() ?? "—"}
                </span>
            ),
        },
        {
            id: "shelfCode",
            accessorFn: (row) => row.location?.shelfCode ?? null,
            header: "Scaffale",
            cell: ({ getValue }) => (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
                    {getValue() ?? "Non collocato"}
        </span>
            ),
        },
        {
            id: "school",
            accessorFn: (row) => row.location?.school?.name ?? null,
            header: "Scuola",
            cell: ({ getValue }) => (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <School className="h-3.5 w-3.5" />
                    {getValue() ?? "—"}
        </span>
            ),
        },
        {
            accessorKey: "price",
            header: "Prezzo",
            cell: ({ getValue }) => <span className="text-sm">{formatPrice(getValue())}</span>,
        },
        {
            accessorKey: "acquisitionDate",
            header: "Data acquisto",
            cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue())}</span>,
        },
    ];

    // Azioni per tutto lo staff (presta, modifica); l'eliminazione resta all'admin
    columns.push({
        id: "actions",
        header: "",
        cell: ({ row }) => (
            <ItemTableActions item={row.original} work={work} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
        ),
    });

    return columns;
};