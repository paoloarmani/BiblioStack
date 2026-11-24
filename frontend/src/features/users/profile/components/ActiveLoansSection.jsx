import { Link } from "react-router-dom";
import { BookOpen, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item.jsx";
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
        <Item asChild variant="outline" className="group items-start bg-card hover:border-primary/40 hover:bg-secondary/30">
            <Link to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"}>
                <ItemMedia variant="icon" className="size-10 rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                </ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle className="line-clamp-2 w-auto text-base group-hover:text-primary">
                        {work?.title ?? "Titolo non disponibile"}
                    </ItemTitle>
                    {authors && <ItemDescription className="truncate">{authors}</ItemDescription>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <span>Dal {safeFormat(loan.loanDate)}</span>
                        {loan.dueDate && <span>Restituire entro il <span className="font-medium text-foreground">{safeFormat(loan.dueDate)}</span></span>}
                        <DueBadge dueDate={loan.dueDate} />
                    </div>
                </ItemContent>
            </Link>
        </Item>
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
