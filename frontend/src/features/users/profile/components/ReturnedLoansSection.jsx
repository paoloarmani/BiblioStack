import { Link } from "react-router-dom";
import { BookCheck, BookX } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { formatAuthors } from "@/lib/authorUtils.js";
import { formatDateShort } from "@/lib/dateUtils.js";
import { ProfileSection, EmptyNote } from "@/features/users/profile/components/ProfileSection.jsx";

function ReturnedLoanRow({ loan }) {
    const late = loan.returnDate && loan.dueDate && new Date(loan.returnDate) > new Date(loan.dueDate);
    const work = loan.item?.work;
    const authors = formatAuthors(work?.authors);

    return (
        <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            {late
                ? <BookX className="h-4 w-4 shrink-0 text-warning" />
                : <BookCheck className="h-4 w-4 shrink-0 text-success" />}
            <div className="min-w-0 flex-1">
                <Link to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"}
                      className="line-clamp-1 text-sm font-medium hover:text-primary">
                    {work?.title ?? "Titolo non disponibile"}
                </Link>
                {authors && <p className="truncate text-xs text-muted-foreground">{authors}</p>}
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p className="whitespace-nowrap">{formatDateShort(loan.loanDate)} → {formatDateShort(loan.returnDate)}</p>
                {late && <Badge variant="outline" className="mt-1 border-warning text-amber-700 dark:text-amber-400">In ritardo</Badge>}
            </div>
        </li>
    );
}

export default function ReturnedLoansSection({ loans }) {
    return (
        <ProfileSection title="Ultimi prestiti restituiti" linkTo="/loans?status=returned&page=1">
            {loans.length === 0 ? (
                <EmptyNote>Lo storico dei prestiti restituiti comparirà qui.</EmptyNote>
            ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                    {loans.map((loan) => <ReturnedLoanRow key={loan.id} loan={loan} />)}
                </ul>
            )}
        </ProfileSection>
    );
}
