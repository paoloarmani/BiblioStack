import { Link } from "react-router-dom";
import { BookCheck, BookX } from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item.jsx";
import { Fragment } from "react";
import { formatAuthors } from "@/lib/authorUtils.js";
import { formatDateShort } from "@/lib/dateUtils.js";
import { ProfileSection, EmptyNote } from "@/features/users/profile/components/ProfileSection.jsx";

function ReturnedLoanRow({ loan }) {
    const late = loan.returnDate && loan.dueDate && new Date(loan.returnDate) > new Date(loan.dueDate);
    const work = loan.item?.work;
    const authors = formatAuthors(work?.authors);

    return (
        <Item size="sm" role="listitem">
            <ItemMedia variant="icon" className={late ? "text-warning" : "text-success"}>
                {late ? <BookX /> : <BookCheck />}
            </ItemMedia>
            <ItemContent className="min-w-0 gap-0.5">
                <ItemTitle className="w-auto">
                    <Link to={work?.id ? `/works/${encodeURIComponent(work.id)}` : "#"} className="hover:text-primary">
                        {work?.title ?? "Titolo non disponibile"}
                    </Link>
                </ItemTitle>
                {authors && <ItemDescription className="truncate text-xs">{authors}</ItemDescription>}
            </ItemContent>
            <ItemActions className="flex-col items-end gap-1 text-xs text-muted-foreground">
                <span className="whitespace-nowrap">{formatDateShort(loan.loanDate)} → {formatDateShort(loan.returnDate)}</span>
                {late && <Badge variant="outline" className="border-warning text-amber-700 dark:text-amber-400">In ritardo</Badge>}
            </ItemActions>
        </Item>
    );
}

export default function ReturnedLoansSection({ loans }) {
    return (
        <ProfileSection title="Ultimi prestiti restituiti" linkTo="/loans?status=returned&page=1">
            {loans.length === 0 ? (
                <EmptyNote>Lo storico dei prestiti restituiti comparirà qui.</EmptyNote>
            ) : (
                <ItemGroup className="gap-0 rounded-xl border border-border bg-card">
                    {loans.map((loan, i) => (
                        <Fragment key={loan.id}>
                            {i > 0 && <ItemSeparator className="my-0" />}
                            <ReturnedLoanRow loan={loan} />
                        </Fragment>
                    ))}
                </ItemGroup>
            )}
        </ProfileSection>
    );
}
