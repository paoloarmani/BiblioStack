import { useState } from "react";
import { Link } from "react-router-dom";
import { BookMarked, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
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
            <div className={`flex gap-3 rounded-xl border bg-card p-3 sm:p-4 ${ready ? "border-success/40" : "border-border"}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ready ? "bg-success/15" : "bg-primary/10"}`}>
                    <BookMarked className={`h-5 w-5 ${ready ? "text-success" : "text-primary"}`} />
                </div>

                <div className="min-w-0 flex-1">
                    <Link
                        to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"}
                        className="line-clamp-2 font-medium leading-snug hover:text-primary"
                    >
                        {work?.title ?? "Titolo non disponibile"}
                    </Link>
                    {authors && <p className="truncate text-sm text-muted-foreground">{authors}</p>}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
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
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setCancelOpen(true)}
                    disabled={loading}
                    aria-label="Annulla prenotazione"
                    title="Annulla prenotazione"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

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
