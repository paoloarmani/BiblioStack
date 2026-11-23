import { useEffect, useState } from "react";
import { BookUp, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.jsx";
import DateSelector from "@/components/common/DateSelector.jsx";
import UserPicker from "@/features/loans/management/components/UserPicker.jsx";
import api from "@/api/axios.js";
import { notify } from "@/lib/notify.js";
import { handleApiError } from "@/lib/handleApiError.js";

const DEFAULT_LOAN_DAYS = 30;

// Scadenza proposta: tra 30 giorni, spostata al lunedì se cade nel fine settimana
function defaultDueDate() {
    const d = new Date();
    d.setDate(d.getDate() + DEFAULT_LOAN_DAYS);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
}

// Prestito di un'opera direttamente dalla gestione opere (o di una copia precisa dal dettaglio):
// scelta della copia disponibile, dell'utente e della scadenza.
export default function LendWorkDialog({ open, onClose, work, initialItemId = null, onDone }) {
    const [copies, setCopies] = useState([]);
    const [loadingCopies, setLoadingCopies] = useState(false);
    const [itemId, setItemId] = useState(null);
    const [user, setUser] = useState(null);
    const [dueDate, setDueDate] = useState(defaultDueDate());
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!open || !work?.id) return;
        let cancelled = false;
        const load = async () => {
            setLoadingCopies(true);
            try {
                const { data } = await api.get(`/works/${encodeURIComponent(work.id)}`);
                if (cancelled) return;
                const available = (data.items ?? []).filter(i => i.available);
                setCopies(available);
                setItemId(initialItemId && available.some(i => i.id === initialItemId)
                    ? initialItemId
                    : available[0]?.id ?? null);
            } catch (err) {
                handleApiError(err);
            } finally {
                if (!cancelled) setLoadingCopies(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [open, work?.id, initialItemId]);

    const close = () => {
        setUser(null);
        setErrors({});
        setDueDate(defaultDueDate());
        onClose();
    };

    const submit = async (e) => {
        e.preventDefault();
        const next = {};
        if (!itemId) next.item = "Scegli una copia";
        if (!user) next.user = "Scegli l'utente";
        if (!dueDate) next.dueDate = "Indica la scadenza";
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            await api.post("/loans", { userId: user.id, itemId, dueDate });
            notify.success(`Prestito registrato a ${user.firstName} ${user.lastName}`);
            onDone?.();
            close();
        } catch (err) {
            handleApiError(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl">Presta</DialogTitle>
                    <DialogDescription className="line-clamp-2">{work?.title}</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    <div className="space-y-2">
                        <Label>Copia</Label>
                        {loadingCopies ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Carico le copie…
                            </div>
                        ) : copies.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                                Nessuna copia disponibile al prestito: sono tutte in prestito, riservate, smarrite o di sola consultazione.
                            </p>
                        ) : (
                            <div role="radiogroup" aria-label="Copia da prestare" className="grid gap-2 sm:grid-cols-2">
                                {copies.map(c => (
                                    <label key={c.id}
                                           className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                                               itemId === c.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                                        <input type="radio" name="itemId" value={c.id} checked={itemId === c.id}
                                               onChange={() => setItemId(c.id)} className="mt-1 accent-primary" />
                                        <span className="min-w-0">
                                            <span className="block font-mono font-medium">{c.id}</span>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3" />{c.shelfMark ?? c.location?.shelfCode ?? "Non collocata"}
                                            </span>
                                            {c.status === "damaged" && (
                                                <span className="text-xs text-amber-700 dark:text-amber-400">Copia danneggiata</span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {errors.item && <p className="text-xs text-destructive">{errors.item}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>A chi</Label>
                        <UserPicker value={user} onChange={setUser} error={errors.user} />
                    </div>

                    <div className="space-y-2">
                        <Label>Restituzione entro</Label>
                        <DateSelector value={dueDate} onChange={setDueDate} minDate={new Date()} excludeWeekends
                                      placeholder="Seleziona la data di scadenza" />
                        {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close} disabled={saving}>Annulla</Button>
                        <Button type="submit" disabled={saving || copies.length === 0} className="gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookUp className="h-4 w-4" />}
                            Registra prestito
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
