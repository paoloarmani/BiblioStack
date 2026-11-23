import { Calendar, Globe, BookMarked, Tag, Building2, Hash } from "lucide-react";
import {safeFormat} from "@/lib/dateUtils.js";

function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
            </div>
        </div>
    );
}

// Le date importate dal vecchio catalogo hanno solo l'anno (salvate come 1° gennaio): mostro solo l'anno
function formatPublication(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.getUTCMonth() === 0 && d.getUTCDate() === 1 ? String(d.getUTCFullYear()) : safeFormat(date);
}

const isIsbn = (id) => /^(97[89])?\d{9}[\dX]$/.test(id ?? "");

export default function DetailWorkInfoGrid({ work }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
            <InfoRow icon={Building2} label="Editore" value={work.publisher?.name} />
            <InfoRow icon={Calendar} label="Pubblicazione" value={formatPublication(work.publicationDate)} />
            <InfoRow icon={Globe} label="Lingua" value={work.language?.name} />
            <InfoRow
                icon={Hash}
                label="Codice Dewey"
                value={work.dewey ? [work.dewey.code, work.dewey.description].filter(Boolean).join(" — ") : null}
            />
            <InfoRow icon={BookMarked} label={isIsbn(work.id) ? "ISBN" : "Codice scheda"} value={work.id} />
            <InfoRow
                icon={Tag}
                label="Copie totali"
                value={work.items?.length > 0 ? String(work.items.length) : null}
            />
        </div>
    );
}