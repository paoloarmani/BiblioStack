import { safeFormat } from "@/lib/dateUtils.js";
import ReservationRowActions from "@/features/reservations/components/ReservationRowActions.jsx";
import ReservationStatusBadge from "@/features/reservations/components/ReservationStatusBadge.jsx";


export const getReservationColumns = ({
                                          onCancel,
                                          showAllColumns = true,
                                          showUserColumn = true
                                      }) => [
    {
        id: "workTitle",
        accessorFn: (row) => row.work?.title ?? "Titolo non disponibile",
        header: "Libro",
        cell: ({ getValue }) => (
            <span className="font-medium max-w-55 truncate block">
                {getValue()}
            </span>
        ),
    },

    {
        id: "assignedItem",
        accessorFn: (row) => row.assignedItem?.id ?? "-",
        header: "Copia assegnata",
        cell: ({ getValue }) => (
            <span className="font-mono text-sm">
                {getValue()}
            </span>
        ),
    },

    ...(showAllColumns && showUserColumn ? [{
        id: "user",
        accessorKey: "user",
        header: "Utente",
        cell: ({ getValue }) => {
            const user = getValue();

            if (!user) {
                return (
                    <span className="text-sm text-muted-foreground">
                        —
                    </span>
                );
            }

            return (
                <span className="text-sm">
                    {user.firstName} {user.lastName}
                </span>
            );
        },
    }] : []),

    {
        id: "school",
        accessorFn: (row) =>
            row.assignedItem?.location?.school?.name ?? "—",
        header: "Scuola",
        cell: ({getValue}) => (
            <span className="text-sm">
                {getValue()}
            </span>
        ),
    },

    ...(showAllColumns ? [{
        id: "shelfCode",
        accessorFn: (row) =>
            row.assignedItem?.location?.shelfCode ?? "—",
        header: "Scaffale",
        cell: ({ getValue }) => (
            <span className="font-mono text-sm">
                {getValue()}
            </span>
        ),
    }] : []),

    {
        accessorKey: "reservationDate",
        header: "Data prenotazione",
        cell: ({ getValue }) => (
            <span className="text-sm">
                {safeFormat(getValue()) ?? "—"}
            </span>
        ),
        sortingFn: "datetime",
    },

    {
        id: "status",
        header: "Stato",
        enableSorting: false,
        cell: ({ row }) => (
            <ReservationStatusBadge
                status={row.original.status}
                expiresAt={row.original.expiresAt}
            />
        ),
    },

    ...(showAllColumns ? [{
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
            <ReservationRowActions
                reservation={row.original}
                onCancel={onCancel}
            />
        ),
    }] : []),
];