import { Controller } from "react-hook-form";
import { useState } from "react";
import { Calendar, Euro, MapPin, CircleCheck, Bookmark, BookLock } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Label } from "@/components/ui/label.jsx";
import { SummaryRow } from "@/components/common/SummaryRow.jsx";
import { useEditItem } from "@/features/items/management/hooks/useEditItem.js";
import { useLocations } from "@/features/items/management/hooks/useLocations.js";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.jsx";
import LocationSelect from "@/features/items/management/components/LocationSelect.jsx";
import DateSelector from "@/components/common/DateSelector.jsx";
import ConfirmDialog from "@/components/common/dialogs/ConfirmDialog.jsx";


const ITEM_STATUS_OPTIONS = [
    { value: "active", label: "Attiva" },
    { value: "damaged", label: "Danneggiata" },
    { value: "lost", label: "Smarrita" },
];

export default function EditItemDialog({ item, open, onClose, onConfirm }) {

    const [confirmOpen, setConfirmOpen] = useState(false);

    // Chiusura totale con reset degli stati del dialog di conferma
    const handleFullClose = () => {
        setConfirmOpen(false);
        onClose();
    };

    const { locations, loading: locationsLoading } = useLocations(open);

    const { form, loading, submit } = useEditItem(item, open, () => {
        onConfirm?.();
        handleFullClose();
    });

    const { register, watch, setValue, formState: { errors } } = form;

    if (!item) return null;

    // Intercetta l'invio dei dati e apre il riepilogo
    const handlePreSubmit = async (e) => {
        e.preventDefault();
        const valid = await form.trigger();
        if (!valid) return;
        setConfirmOpen(true);
    };

    // Build dei dati per il riepilogo
    const locationId = watch("locationId");
    const summaryData = {
        shelfMark: watch("shelfMark"),
        notLoanable: watch("notLoanable"),
        acquisitionDate: watch("acquisitionDate"),
        price: watch("price"),
        locationLabel: locations.find(l => l.id === locationId)?.shelfCode ?? (locationId ? `Scaffale ${locationId}` : null),
        status: watch("status")
    };


    return (
        <>
            <Dialog open={open && !confirmOpen} onOpenChange={(v) => !v && handleFullClose()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Modifica copia</DialogTitle>
                        <DialogDescription>
                            Codice inventario: <span className="font-mono">{item.id}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handlePreSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="price">Prezzo (€)</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                {...register("price")}
                                placeholder="Facoltativo"
                            />
                            {errors.price && (
                                <span className="text-xs text-destructive">{errors.price.message}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="acquisitionDate">Data acquisto</Label>
                            <DateSelector
                                value={watch("acquisitionDate") ?? ""}
                                onChange={(val) => setValue("acquisitionDate", val, {shouldValidate: true})}
                                placeholder={"Seleziona data"}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="shelfMark">Collocazione</Label>
                            <Input
                                id="shelfMark"
                                {...register("shelfMark")}
                                placeholder="es. A1 I 3"
                            />
                            {errors.shelfMark && (
                                <span className="text-xs text-destructive">{errors.shelfMark.message}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Scaffale</Label>
                            {locationsLoading ? (
                                <div className="h-9 rounded-md bg-secondary animate-pulse" />
                            ) : (
                                <LocationSelect
                                    locations={locations}
                                    value={watch("locationId")}
                                    onValueChange={(val) => setValue("locationId", val)}
                                />
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label>Stato</Label>

                            <div
                                className="flex w-fit items-center rounded-lg border border-border bg-muted p-1"
                                role="group"
                                aria-label="Stato della copia"
                            >
                                {ITEM_STATUS_OPTIONS.map((option) => {
                                    const active = watch("status") === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                                setValue("status", option.value, {
                                                    shouldValidate: true,
                                                    shouldDirty: true,
                                                })
                                            }
                                            aria-pressed={active}
                                            className={[
                                                "inline-flex items-center justify-center",
                                                "rounded-md px-3 py-1.5",
                                                "text-xs font-medium",
                                                "transition-colors",
                                                active
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground",
                                            ].join(" ")}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {errors.status && (
                                <span className="text-xs text-destructive">
                                    {errors.status.message}
                                </span>
                            )}
                        </div>


                        <div className="flex items-start gap-2">
                            <Controller
                                name="notLoanable"
                                control={form.control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="edit-item-not-loanable"
                                        checked={!!field.value}
                                        onCheckedChange={(checked) => field.onChange(checked === true)}
                                        className="mt-0.5"
                                    />
                                )}
                            />
                            <Label htmlFor="edit-item-not-loanable" className="flex-col items-start gap-0.5 font-normal">
                                Prestito non consentito
                                <span className="text-xs text-muted-foreground">Solo consultazione in sede (dizionari, enciclopedie...)</span>
                            </Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Annulla
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvataggio..." : "Salva"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmOpen}
                onClose={handleFullClose}
                onConfirm={submit}
                loading={loading}
                title="Conferma modifiche"
                description={`Controlla i dati aggiornati per la copia "${item.id}":`}
                confirmLabel="Salva modifiche"
                cancelLabel="Indietro"
                onCancel={() => setConfirmOpen(false)}
            >
                <div className="space-y-3 py-2">
                    <SummaryRow
                        icon={Bookmark}
                        label="Collocazione"
                        value={summaryData.shelfMark?.trim() || "Non specificata"}
                    />
                    <SummaryRow
                        icon={BookLock}
                        label="Prestito"
                        value={summaryData.notLoanable ? "Non consentito (solo consultazione)" : "Consentito"}
                    />
                    <SummaryRow
                        icon={MapPin}
                        label="Scaffale"
                        value={summaryData.locationLabel || "Non specificata"}
                    />
                    <SummaryRow
                        icon={Calendar}
                        label="Data di acquisto"
                        value={summaryData.acquisitionDate ? format(new Date(summaryData.acquisitionDate), "PPP", { locale: it }) : "Non specificata"}
                    />
                    <SummaryRow
                        icon={Euro}
                        label="Prezzo"
                        value={summaryData.price ? `€ ${Number(summaryData.price).toFixed(2)}` : "Non specificato"}
                    />
                    <SummaryRow
                        icon={CircleCheck}
                        label="Stato"
                        value={
                            ITEM_STATUS_OPTIONS.find(
                                (option) => option.value === summaryData.status
                            )?.label ?? "Non specificato"
                        }
                    />
                </div>
            </ConfirmDialog>

        </>
    );
}