import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Download, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import ConfirmDialog from "@/components/common/dialogs/ConfirmDialog.jsx";
import { useMyCard } from "@/features/qrCode/hooks/useMyCard.js";
import { useAuth } from "@/context/useAuth.js";
import { useLibraryInfo } from "@/features/config/useLibraryInfo.js";
import { downloadCanvas, printCanvas, renderCardCanvas } from "@/features/qrCode/cardImage.js";
import { notify } from "@/lib/notify.js";

const slug = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export default function CardView() {
    const { token, loading, renewing, renew } = useMyCard();
    const { user } = useAuth() ?? {};
    const library = useLibraryInfo();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [busy, setBusy] = useState(null); // "download" | "print" | null
    const qrCanvasRef = useRef(null);

    if (loading) {
        return <Skeleton className="h-64 w-64 rounded-3xl" />;
    }

    if (!token) {
        return (
            <p className="text-sm text-muted-foreground">
                Impossibile caricare la tessera. Riprova più tardi.
            </p>
        );
    }

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Utente";

    const buildCard = () => renderCardCanvas({
        qrCanvas: qrCanvasRef.current,
        libraryName: library?.name ?? "Biblioteca",
        fullName,
        cardNumber: user?.id ?? "",
    });

    const run = (kind, action) => async () => {
        setBusy(kind);
        try {
            await action(await buildCard());
        } catch {
            notify.error("Impossibile generare la tessera");
        } finally {
            setBusy(null);
        }
    };

    const download = run("download", (canvas) => downloadCanvas(canvas, `tessera-biblioteca-${slug(fullName)}.png`));
    const print = run("print", (canvas) => printCanvas(canvas, `Tessera biblioteca - ${fullName}`));

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="rounded-3xl border border-border p-6 bg-white shadow-sm">
                <QRCodeSVG value={token} size={200} marginSize={0} title="QR della tessera" />
            </div>

            {/* QR ad alta risoluzione, non visibile: è la sorgente dell'immagine scaricata e stampata */}
            <QRCodeCanvas ref={qrCanvasRef} value={token} size={720} marginSize={2} className="hidden" aria-hidden="true" />

            <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={download} disabled={!!busy}>
                    {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}
                    Scarica
                </Button>
                <Button type="button" variant="outline" onClick={print} disabled={!!busy}>
                    {busy === "print" ? <Loader2 className="animate-spin" /> : <Printer />}
                    Stampa
                </Button>
            </div>
            <p className="-mt-3 max-w-xs text-center text-xs text-muted-foreground">
                La tessera stampata è in formato carta di credito: ritagliala lungo il bordo.
            </p>

            <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={renewing}
                className="h-auto whitespace-normal text-center text-xs text-destructive"
            >
                <RefreshCw className={renewing ? "animate-spin" : ""} />
                Tessera smarrita o compromessa? Richiedi una nuova tessera
            </Button>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={renew}
                title="Rinnovare la tessera?"
                description="Il QR attuale, anche se stampato su una tessera fisica, smetterà immediatamente di funzionare. Questa azione non è reversibile."
                confirmLabel="Rinnova"
                variant="destructive"
            />
        </div>
    );
}
