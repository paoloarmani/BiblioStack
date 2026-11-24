import LoanStatusBadge from "@/features/loans/components/LoanStatusBadge.jsx";
import { safeFormat } from "@/lib/dateUtils.js";
import { LoanTableActions } from "@/features/loans/management/components/LoanTableActions.jsx";

function isDeletedUser(user) {
    return user?.firstName.toLowerCase() === "deleted" && user?.lastName.toLowerCase() === "user";
}

function deletedUserLabel(user) {
    return `Utente eliminato #${user.id}`;
}


// showPatron: false quando la tabella è già scoped a un singolo utente (es. dashboard admin utente)
// Se si passa isStaff = false non compaiono le colonne relative a: copia, utente, bibliotecario e l'hamburger filtri
export const getLoansColumns = ({ onEdit, onNotify, showAllColumns = true, showPatron = true }) => [
    {
        id: "status",
        header: "Stato",
        enableSorting: false,
        cell: ({ row }) => <LoanStatusBadge loan={row.original} />,
    },
    {
        id: "workTitle",
        accessorFn: (row) => row.item?.work?.title ?? "Titolo non disponibile",
        header: "Opera",
        cell: ({ getValue }) => <span className="text-sm max-w-55 truncate block">{getValue()}</span>,
    },
    ...(showAllColumns ? [{
        accessorKey: "item.id",
        header: "Copia",
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
    }] : []),
    ...(showAllColumns && showPatron ? [{
        accessorKey: "patron",
        header: "Utente",
        cell: ({ getValue }) => {
            const patron = getValue();
            if (isDeletedUser(patron)) {
                return <span className="text-sm text-muted-foreground italic">{deletedUserLabel(patron)}</span>;
            }
            return <span className="text-sm">{patron.firstName} {patron.lastName}</span>;
        },
    }] : []),
    ...(showAllColumns ? [{
        accessorKey: "librarian",
        header: "Bibliotecario",
        cell: ({ getValue }) => {
            const librarian = getValue();
            if (!librarian) return <span className="text-sm text-muted-foreground">—</span>;
            return <span className="text-sm text-muted-foreground">{librarian.firstName} {librarian.lastName}</span>;
        }
    }] : []),
    {
        accessorKey: "loanDate",
        header: "Data prestito",
        cell: ({ getValue }) => <span className="text-sm">{safeFormat(getValue()) ?? "—"}</span>,
        sortingFn: "datetime",
    },
    {
        accessorKey: "dueDate",
        header: "Scadenza",
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{safeFormat(getValue()) ?? "—"}</span>,
        sortingFn: "datetime",
    },
    {
        accessorKey: "returnDate",
        header: "Restituito il",
        cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{safeFormat(getValue()) ?? "—"}</span>,
        sortingFn: "datetime",
    },
    ...(showAllColumns ? [{
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
            <LoanTableActions loan={row.original} onEdit={onEdit} onNotify={onNotify} />
        )
    }] : [])
];