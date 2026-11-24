import { useAuth } from "@/context/useAuth.js";
import { handleApiError } from "@/lib/handleApiError.js";
import { notify } from "@/lib/notify.js";
import { BookOpen, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge.jsx";
import {Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty.jsx";
import api from "@/api/axios.js";
import WorkReservationButton from "@/features/works/detail/components/WorkReservationButton.jsx";
import DetailWorkDetailSkeleton from "@/features/works/detail/components/DetailWorkSkeleton.jsx";
import DetailWorkCover from "@/features/works/detail/components/DetailWorkCover.jsx";
import DetailWorkInfoGrid from "@/features/works/detail/components/DetailWorkInfoGrid.jsx";
import DetailWorkDescription from "@/features/works/detail/components/DetailWorkDescription.jsx";
import StaffItemsTable from "@/features/items/management/components/StaffItemsTable.jsx";
import WorkReservationQueue from "@/features/works/detail/components/WorkReservationQueue.jsx";



export default function WorkDetail({ work, loading, error, refetch }) {
    const { user, isAuthenticated } = useAuth();

    if (loading) return <DetailWorkDetailSkeleton />;

    if (error || !work) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <BookOpen />
                    </EmptyMedia>
                    <EmptyTitle>Opera non trovata</EmptyTitle>
                    <EmptyDescription>
                        Il libro richiesto potrebbe essere stato rimosso o l’indirizzo non è corretto.
                    </EmptyDescription>
                </EmptyHeader>
            </Empty>
        );
    }

    const isStaff = user?.role === "librarian" || user?.role === "admin";
    const isAdmin = user?.role === "admin";
    const authors = work.authors?.map(a => `${a.firstName} ${a.lastName}`).join(", ") || "—";
    const available = work.availableCount ?? 0;
    const referenceOnly = work.referenceOnlyCount ?? 0;
    // Opera con sole copie di consultazione: non si presta e non si prenota
    const consultationOnly = (work.loanableCount ?? 0) === 0 && referenceOnly > 0;
    const shelvedItems = (work.items ?? []).filter(i => i.shelfMark && i.status !== "lost");


    const handleDeleteItem = async (itemId) => {
        try {
            await api.delete(`/items/${itemId}`);
            notify.success("Copia eliminata");
            refetch();
        } catch (err) {
            handleApiError(err);
        }
    };

    return (
        <div className="flex flex-col gap-6 pt-12">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
                <DetailWorkCover coverUrl={work.coverUrl} title={work.title}/>

                <div className="flex flex-col gap-5 flex-1 min-w-0">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold leading-tight">{work.title}</h1>
                        <p className="text-lg text-muted-foreground">{authors}</p>
                    </div>

                    {/* Generi */}
                    {work.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {work.genres.map(g => (
                                <Badge key={g.id} variant="secondary">
                                    {g.name}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Soggetti (argomenti trattati) */}
                    {work.subjects?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">Soggetti:</span>
                            {work.subjects.map(s => (
                                <Badge key={s.id} variant="outline" asChild>
                                    <Link
                                        to={`/catalog?subjectId=${s.id}&subjectName=${encodeURIComponent(s.name)}`}
                                        title={`Altre opere su "${s.name}"`}
                                    >
                                        {s.name}
                                    </Link>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Prenota */}
                    <div className="flex items-center gap-8 flex-wrap">
                        {consultationOnly ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium w-fit bg-secondary text-secondary-foreground">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground"/>
                                Solo consultazione in sede
                            </div>
                        ) : (
                            <div
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium w-fit ${available > 0 ? "bg-success/20 text-success" : "bg-destructive/10 text-destructive"}`}>
                                <div className={`h-2 w-2 rounded-full ${available > 0 ? "bg-success" : "bg-destructive"}`}/>
                                {available > 0 ? `${available} cop${available === 1 ? "ia disponibile" : "ie disponibili"}` : "Non disponibile"}
                            </div>
                        )}
                        {!consultationOnly && referenceOnly > 0 && (
                            <span className="text-xs text-muted-foreground">
                                + {referenceOnly} cop{referenceOnly === 1 ? "ia" : "ie"} solo in consultazione
                            </span>
                        )}

                        {isAuthenticated && !consultationOnly && <WorkReservationButton work={work}/>}
                    </div>

                    <DetailWorkInfoGrid work={work}/>
                </div>
            </div>

            <DetailWorkDescription description={work.description}/>

            {/* Dove trovarlo: collocazioni delle copie presenti (lo staff ha la tabella completa più sotto) */}
            {!isStaff && shelvedItems.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold">Dove trovarlo</h2>
                    <ul className="flex flex-wrap gap-2">
                        {shelvedItems.map(item => (
                            <Badge asChild key={item.id} variant="outline" className="h-auto gap-2 rounded-lg px-3 py-1.5 text-sm font-normal">
                                <li>
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono">{item.shelfMark}</span>
                                    {!item.loanable && (
                                        <span className="text-xs text-muted-foreground">· solo consultazione</span>
                                    )}
                                    {item.status === "damaged" && (
                                        <span className="text-xs text-muted-foreground">· copia danneggiata</span>
                                    )}
                                </li>
                            </Badge>
                        ))}
                    </ul>
                </section>
            )}

            {isStaff && work.items?.length > 0 && (
                <>
                    <StaffItemsTable items={work.items} work={work} isAdmin={isAdmin} onEdit={refetch} onDelete={handleDeleteItem}/>
                    <WorkReservationQueue reservations={work.activeReservations}/>
                </>
            )}
        </div>
    );
}
