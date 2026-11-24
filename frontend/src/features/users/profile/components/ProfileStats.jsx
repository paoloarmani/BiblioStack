import { BookOpen, Clock, PackageCheck } from "lucide-react";
import { daysUntil } from "@/lib/dateUtils.js";
import { Card, CardContent } from "@/components/ui/card.jsx";

function Stat({ icon: Icon, label, value, tone = "default" }) {
    const tones = {
        default: "bg-primary/10 text-primary",
        warning: "bg-warning/15 text-amber-700 dark:text-amber-400",
        danger: "bg-destructive/10 text-destructive",
        success: "bg-success/15 text-success",
    };
    return (
        <Card size="sm" className="py-3 sm:py-4">
            <CardContent className="flex flex-col gap-2 px-3 sm:flex-row sm:items-center sm:gap-3 group-data-[size=sm]/card:px-3 sm:group-data-[size=sm]/card:px-4">
                <div className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${tones[tone]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-2xl font-semibold leading-none tabular-nums">
                        <Icon className={`h-4 w-4 sm:hidden ${tones[tone].split(" ").find(c => c.startsWith("text-"))}`} />
                        {value}
                    </p>
                    <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Riepilogo a colpo d'occhio: prestiti in corso, scadenze vicine/superate, prenotazioni da ritirare
export default function ProfileStats({ activeLoans = [], activeReservations = [] }) {
    const days = activeLoans.map(l => daysUntil(l.dueDate, { noMax: true })).filter(d => d !== null);
    const overdue = days.filter(d => d < 0).length;
    const dueSoon = days.filter(d => d >= 0 && d <= 3).length;
    const ready = activeReservations.filter(r => r.status === "ready").length;

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat icon={BookOpen} label="Prestiti in corso" value={activeLoans.length} />
            {overdue > 0
                ? <Stat icon={Clock} label="Prestiti scaduti" value={overdue} tone="danger" />
                : <Stat icon={Clock} label="In scadenza entro 3 giorni" value={dueSoon} tone={dueSoon ? "warning" : "default"} />}
            <Stat icon={PackageCheck} label="Prenotazioni da ritirare" value={ready} tone={ready ? "success" : "default"} />
        </div>
    );
}
