import {useState} from "react";
import {ActionsMenu} from "@/components/common/dialogs/ActionsMenu.jsx";
import {DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu.jsx";
import {DeleteConfirmDialog} from "@/components/common/dialogs/DeleteConfirmDialog.jsx";
import { Pencil, Trash2, BookUp } from "lucide-react";
import EditItemDialog from "@/features/items/management/components/EditItemDialog.jsx";
import LendWorkDialog from "@/features/loans/management/components/LendWorkDialog.jsx";

// Azioni sulla singola copia (staff): presta, modifica; eliminazione solo per l'admin
export function ItemTableActions({ item, work, isAdmin = false, onEdit, onDelete }) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [lendOpen, setLendOpen] = useState(false);

    return (
        <>
        <ActionsMenu>
            {item.available && (
                <DropdownMenuItem onClick={() => setLendOpen(true)}>
                    <BookUp className="mr-2 h-4 w-4"/>
                    Presta questa copia
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4"/>
                Modifica
            </DropdownMenuItem>
            {isAdmin && (
                <>
                    <DropdownMenuSeparator/>
                    <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Elimina
                    </DropdownMenuItem>
                </>
            )}
        </ActionsMenu>

            {work && (
                <LendWorkDialog open={lendOpen} onClose={() => setLendOpen(false)} work={work}
                                initialItemId={item.id} onDone={onEdit} />
            )}

            <DeleteConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={"Elimina copia"}
                description={`Sei sicuro di voler eliminare la copia ${item.id}? L'operazione è irreversibile.`}
                onConfirm={() => onDelete(item.id)}
            />

            <EditItemDialog item={item} open={editOpen} onClose={() => setEditOpen(false)} onConfirm={onEdit}/>
        </>
    );
}