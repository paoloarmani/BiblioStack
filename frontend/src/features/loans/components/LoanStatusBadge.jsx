import { Badge } from "@/components/ui/badge.jsx";
import { daysUntil } from "@/lib/dateUtils.js";

// Stato del prestito: restituito (in tempo o in ritardo), scaduto, in scadenza, in corso
export default function LoanStatusBadge({ loan }) {
    if (loan.returnDate) {
        const late = loan.dueDate && new Date(loan.returnDate) > new Date(loan.dueDate);
        return late
            ? <Badge variant="outline" className="border-warning text-warning">Restituito in ritardo</Badge>
            : <Badge variant="outline" className="text-muted-foreground">Restituito</Badge>;
    }

    const days = daysUntil(loan.dueDate, { noMax: true });
    if (days !== null && days < 0) {
        return <Badge variant="destructive">Scaduto da {Math.abs(days)}g</Badge>;
    }

    if (days !== null && days === 0) {
        return <Badge variant="outline" className="border-warning text-warning">Scade oggi</Badge>;
    }

    if (days !== null && days <= 3) {
        return <Badge variant="outline" className="border-warning text-warning">Scade tra {days}g</Badge>;
    }
    return <Badge variant="outline" className="border-primary text-primary">In corso</Badge>;
}
