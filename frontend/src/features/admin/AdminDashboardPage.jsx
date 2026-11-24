import DashboardStats from "@/features/operatorDashboard/components/OperatorDashboardStats.jsx";
import RecentNotices from "@/features/operatorDashboard/components/RecentNoticesCard.jsx";

import { useDashboard } from "@/features/operatorDashboard/hooks/useOperatorDashboard.js";
import ReadyReservationsCard from "@/features/operatorDashboard/components/ReadyReservationCard.jsx";

export default function DashboardPage() {
    const {
        stats, statsLoading,
        notices, noticesLoading,
        readyReservations, readyReservationsLoading
    } = useDashboard();

    return (
        <main className="min-h-screen bg-background">
            <div className="mx-auto w-full max-w-7xl px-4 pt-24 pb-12 space-y-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>

                <DashboardStats stats={stats} loading={statsLoading} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ReadyReservationsCard reservations={readyReservations} loading={readyReservationsLoading} />
                    <RecentNotices notices={notices} loading={noticesLoading} />
                </div>
            </div>
        </main>
    )
}