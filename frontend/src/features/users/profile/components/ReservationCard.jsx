import { useState } from "react";
import { Link } from "react-router-dom";
import { BookMarked, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item.jsx";
import { formatAuthors } from "@/lib/authorUtils.js";
import { safeFormat } from "@/lib/dateUtils.js";
import ConfirmDialog from "@/components/common/dialogs/ConfirmDialog.jsx";
import ReservationStatusBadge from "@/features/reservations/components/ReservationStatusBadge.jsx";

export default function ReservationCard({ reservation, onCancel, loading }) {
    const [cancelOpen, setCancelOpen] = useState(false);

    const work = reservation.work;
    const authors = formatAuthors(work?.authors);
    const ready = reservation.status === "ready";
    const shelfMark = reservation.assignedItem?.shelfMark;

    const handleConfirmCancel = async () => {
        const success = await onCancel(reservation.id);
        if (success) setCancelOpen(false);
    };

    return (
        <>
            <Item variant="outline" className={`items-start bg-card ${ready ? "border-success/40" : ""}`}>
                <ItemMedia variant="icon" className={`size-10 rounded-lg ${ready ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
                    <BookMarked className="size-5" />
                </ItemMedia>

                <ItemContent className="min-w-0">
                    <ItemTitle className="line-clamp-2 w-auto text-base">
                        <Link to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"} className="hover:text-primary">
                            {work?.title ?? "Titolo non disponibile"}
                        </Link>
                    </ItemTitle>
                    {authors && <ItemDescription className="truncate">{authors}</ItemDescription>}

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <ReservationStatusBadge status={reservation.status} expiresAt={reservation.expiresAt} />
                        {ready && reservation.expiresAt
                            ? <span>Ritira entro il <span className="font-medium text-foreground">{safeFormat(reservation.expiresAt)}</span></span>
                            : <span>Prenotata il {safeFormat(reservation.reservationDate)}</span>}
                        {ready && shelfMark && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Copia <span className="font-mono">{reservation.assignedItem.id}</span> · {shelfMark}
                            </span>
                        )}
                    </div>
                </ItemContent>

                <ItemActions>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setCancelOpen(true)}
                        disabled={loading}
                        aria-label="Annulla prenotazione"
                        title="Annulla prenotazione"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </ItemActions>
            </Item>

            <ConfirmDialog
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                onConfirm={handleConfirmCancel}
                closeOnConfirm={false}
                title="Annulla prenotazione"
                description={`Sei sicuro di voler annullare la prenotazione per "${work?.title ?? "questa opera"}"?`}
                confirmLabel="Annulla prenotazione"
                cancelLabel="Chiudi"
                variant="destructive"
            />
        </>
    );
}
