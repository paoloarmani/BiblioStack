import { useState } from "react";
import { Link } from "react-router-dom";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu.jsx";
import { Pencil, Trash2, BookPlus, BookUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { ActionsMenu } from "@/components/common/dialogs/ActionsMenu.jsx";
import { DeleteConfirmDialog } from "@/components/common/dialogs/DeleteConfirmDialog.jsx";
import EditWorkDialog from "@/features/works/management/dialogs/EditWorkDialog.jsx";
import AddItemDialog from "@/features/items/management/components/AddItemDialog.jsx";
import LendWorkDialog from "@/features/loans/management/components/LendWorkDialog.jsx";

export function WorkActions({ work, onDelete, onEdit, onChanged }) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [lendOpen, setLendOpen] = useState(false);

    const canLend = (work.copies?.available ?? 0) > 0;

    return (
        <div className="flex items-center gap-1">
            <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setLendOpen(true)}
                disabled={!canLend}
                title={canLend ? "Registra un prestito" : "Nessuna copia disponibile al prestito"}
            >
                <BookUp className="h-4 w-4" />
                <span className="hidden sm:inline">Presta</span>
            </Button>

            <ActionsMenu>
                <DropdownMenuItem asChild>
                    <Link to={`/works/${encodeURIComponent(work.id)}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Scheda e copie
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifica opera
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddItemOpen(true)}>
                    <BookPlus className="mr-2 h-4 w-4" />
                    Aggiungi copia (collocazione, prestito)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                </DropdownMenuItem>
            </ActionsMenu>

            <DeleteConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={"Elimina opera"}
                description={`Sei sicuro di voler eliminare ${work.title}? L'opzione è irreversibile.`}
                onConfirm={() => onDelete(work.id)} />

            <EditWorkDialog
                work={work}
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onConfirm={onEdit}
            />

            <AddItemDialog
                open={addItemOpen}
                onClose={() => { setAddItemOpen(false); onChanged?.(); }}
                workId={work.id}
                workTitle={work.title}
            />

            <LendWorkDialog
                open={lendOpen}
                onClose={() => setLendOpen(false)}
                work={work}
                onDone={onChanged}
            />
        </div>
    );
}
