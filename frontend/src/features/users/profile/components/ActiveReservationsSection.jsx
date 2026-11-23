import ReservationCard from "@/features/users/profile/components/ReservationCard.jsx";
import { useActiveReservations } from "@/features/users/profile/hooks/useActiveReservations.js";
import { ProfileSection, EmptyNote } from "@/features/users/profile/components/ProfileSection.jsx";

export default function ActiveReservationsSection({ reservations }) {
    const { reservations: activeReservations, loadingId, cancelReservation } = useActiveReservations(reservations);

    // Prima quelle pronte per il ritiro
    const sorted = [...activeReservations].sort((a, b) => (b.status === "ready") - (a.status === "ready"));

    return (
        <ProfileSection title="Prenotazioni" count={activeReservations.length} linkTo="/reservations" linkLabel="Vedi tutte">
            {activeReservations.length === 0 ? (
                <EmptyNote>
                    Nessuna prenotazione attiva. Le opere non disponibili si prenotano dalla loro scheda.
                </EmptyNote>
            ) : (
                <div className="flex flex-col gap-2">
                    {sorted.map((reservation) => (
                        <ReservationCard
                            key={reservation.id}
                            reservation={reservation}
                            onCancel={cancelReservation}
                            loading={loadingId === reservation.id}
                        />
                    ))}
                </div>
            )}
        </ProfileSection>
    );
}
