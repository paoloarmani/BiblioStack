import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { Empty, EmptyDescription } from "@/components/ui/empty.jsx";

// Titolo di sezione con link "vedi tutti" e stato vuoto compatto, condivisi dalle sezioni del profilo
export function ProfileSection({ title, count, linkTo, linkLabel = "Vedi tutti", children }) {
    return (
        <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">
                    {title}
                    {count > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>}
                </h2>
                {linkTo && (
                    <Button asChild variant="link" size="sm" className="h-auto shrink-0 px-0">
                        <Link to={linkTo}>{linkLabel}</Link>
                    </Button>
                )}
            </div>
            {children}
        </section>
    );
}

export function EmptyNote({ children }) {
    return (
        <Empty className="rounded-xl border border-border px-4 py-6">
            <EmptyDescription>{children}</EmptyDescription>
        </Empty>
    );
}
