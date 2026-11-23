import { WorkActions } from "@/features/works/management/table/WorksTableActions.jsx";
import CopiesCell from "@/features/works/management/table/CopiesCell.jsx";

const MAX_AUTHORS = 3;

function formatAuthorList(authors) {
    if (!authors?.length) return "Autore sconosciuto";
    const names = authors.map(a => [a.firstName, a.lastName].filter(Boolean).join(" "));
    return names.length > MAX_AUTHORS
        ? `${names.slice(0, MAX_AUTHORS).join(", ")} e altri ${names.length - MAX_AUTHORS}`
        : names.join(", ");
}

export function getWorkColumns({ onDelete, onEdit, onChanged }) {
    return [
        {
            id: "work",
            header: "Opera",
            cell: ({ row }) => {
                const w = row.original;
                return (
                    <div className="min-w-0 max-w-md whitespace-normal">
                        <p className="line-clamp-2 text-sm font-medium" title={w.title}>{w.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">{w.id}</p>
                    </div>
                );
            }
        },
        {
            id: "author",
            header: "Autori",
            cell: ({ row }) => {
                const text = formatAuthorList(row.original.authors);
                return (
                    <p className="line-clamp-2 max-w-xs whitespace-normal text-sm" title={text}>{text}</p>
                );
            }
        },
        {
            id: "copies",
            header: "Copie",
            cell: ({ row }) => <CopiesCell copies={row.original.copies} />
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <WorkActions
                        work={row.original}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onChanged={onChanged}
                    />
                </div>
            )
        }
    ];
}
