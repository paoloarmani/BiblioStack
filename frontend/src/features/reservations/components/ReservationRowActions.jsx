import { useState } from "react";
import { ActionsMenu } from "@/components/common/dialogs/ActionsMenu.jsx";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu.jsx";
import { DeleteConfirmDialog } from "@/components/common/dialogs/DeleteConfirmDialog.jsx";
import { Trash2 } from "lucide-react";

// Azioni di riga: annullamento delle prenotazioni ancora in attesa o pronte
export default function ReservationRowActions({ reservation, onCancel }) {
    const [cancelOpen, setCancelOpen] = useState(false);

    if (!["pending", "ready"].includes(reservation.status)) return null;

    return (
        <>
            <ActionsMenu>
                <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    className="text-destructive focus:text-destructive"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Annulla prenotazione
                </DropdownMenuItem>
            </ActionsMenu>

            <DeleteConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title="Annulla prenotazione"
                description={`Sei sicuro di voler annullare la prenotazione per "${reservation.work?.title ?? "questa opera"}"?`}
                onConfirm={() => onCancel(reservation.id)}
                confirmLabel="Annulla prenotazione"
                loadingLabel="Annullamento"
            />
        </>
    );
}
