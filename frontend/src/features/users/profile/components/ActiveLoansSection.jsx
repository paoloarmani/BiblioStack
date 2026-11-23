import { Link } from "react-router-dom";
import { BookOpen, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { daysUntil, safeFormat } from "@/lib/dateUtils.js";
import { formatAuthors } from "@/lib/authorUtils.js";
import { ProfileSection, EmptyNote } from "@/features/users/profile/components/ProfileSection.jsx";

function DueBadge({ dueDate }) {
    const days = daysUntil(dueDate, { noMax: true });
    if (days === null) return null;

    if (days < 0)
        return (
            <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Scaduto da {Math.abs(days)} {Math.abs(days) === 1 ? "giorno" : "giorni"}
            </Badge>
        );
    if (days <= 3)
        return (
            <Badge variant="outline" className="gap-1 border-warning text-amber-700 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                {days === 0 ? "Scade oggi" : `Scade tra ${days} ${days === 1 ? "giorno" : "giorni"}`}
            </Badge>
        );
    return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            Tra {days} giorni
        </Badge>
    );
}

function LoanCard({ loan }) {
    const work = loan.item?.work;
    const authors = formatAuthors(work?.authors);

    return (
        <Link
            to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"}
            className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary/30 sm:p-4"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium leading-snug group-hover:text-primary">
                    {work?.title ?? "Titolo non disponibile"}
                </p>
                {authors && <p className="truncate text-sm text-muted-foreground">{authors}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    <span>Dal {safeFormat(loan.loanDate)}</span>
                    {loan.dueDate && <span>Restituire entro il <span className="font-medium text-foreground">{safeFormat(loan.dueDate)}</span></span>}
                    <DueBadge dueDate={loan.dueDate} />
                </div>
            </div>
        </Link>
    );
}

export default function ActiveLoansSection({ loans }) {
    // Prima i prestiti che scadono prima
    const sorted = [...loans].sort((a, b) => new Date(a.dueDate ?? 0) - new Date(b.dueDate ?? 0));

    return (
        <ProfileSection title="Prestiti in corso" count={loans.length} linkTo="/loans?status=active&page=1">
            {loans.length === 0 ? (
                <EmptyNote>
                    Nessun prestito in corso. <Link to="/catalog" className="font-medium text-primary hover:underline">Sfoglia il catalogo</Link>
                </EmptyNote>
            ) : (
                <div className="flex flex-col gap-2">
                    {sorted.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
                </div>
            )}
        </ProfileSection>
    );
}
