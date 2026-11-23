import { Link } from "react-router-dom";

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
                    <Link to={linkTo} className="shrink-0 text-sm font-medium text-primary hover:underline">
                        {linkLabel}
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

export function EmptyNote({ children }) {
    return (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {children}
        </div>
    );
}
