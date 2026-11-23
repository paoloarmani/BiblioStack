import { Skeleton } from "@/components/ui/skeleton.jsx";
import ProfileHero from "@/features/users/profile/components/ProfileHero.jsx";
import ActiveLoansSection from "@/features/users/profile/components/ActiveLoansSection.jsx";
import ActiveReservationsSection from "@/features/users/profile/components/ActiveReservationsSection.jsx";
import ReturnedLoansSection from "@/features/users/profile/components/ReturnedLoansSection.jsx";
import ProfileStats from "@/features/users/profile/components/ProfileStats.jsx";

function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
    );
}

export default function Profile({ dashboard, loading, error }) {
    if (loading) return <ProfileSkeleton />;

    if (error || !dashboard) {
        return (
            <div className="text-center text-muted-foreground py-12">
                Errore nel caricamento del profilo.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <ProfileHero user={dashboard.user} />
                <ProfileStats activeLoans={dashboard.activeLoans} activeReservations={dashboard.activeReservations} />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ActiveLoansSection loans={dashboard.activeLoans} />
                <ActiveReservationsSection reservations={dashboard.activeReservations} />
            </div>

            <ReturnedLoansSection loans={dashboard.returnedLoans} />
        </div>
    );
}