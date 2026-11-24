// Immagine della tessera in formato carta di credito (ID-1, 85,6 × 54 mm) a 300 dpi:
// la stessa immagine serve per il download (PNG) e per la stampa.
const DPI = 300;
const MM = DPI / 25.4;
export const CARD_MM = { width: 85.6, height: 54 };
const W = Math.round(CARD_MM.width * MM);   // 1011 px
const H = Math.round(CARD_MM.height * MM);  // 638 px

const COLORS = { primary: "#614afc", text: "#0a0b0f", muted: "#535461", border: "#dcdde8" };
const FONT = "'Inter Variable', system-ui, sans-serif";

// Riduce il corpo del testo finché non entra nella larghezza disponibile (nomi o titoli lunghi)
const fitText = (ctx, text, { weight, size, minSize, maxWidth }) => {
    let s = size;
    do {
        ctx.font = `${weight} ${s}px ${FONT}`;
        if (ctx.measureText(text).width <= maxWidth) return;
        s -= 2;
    } while (s > minSize);
    ctx.font = `${weight} ${minSize}px ${FONT}`;
};

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
};

/**
 * Disegna la tessera. qrCanvas = canvas già renderizzato del QR (QRCodeCanvas di qrcode.react).
 * Restituisce un canvas pronto per toBlob/toDataURL.
 */
export async function renderCardCanvas({ qrCanvas, libraryName, fullName, cardNumber }) {
    // Il font dell'app potrebbe non essere ancora caricato: senza attesa il testo uscirebbe col font di sistema
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Sfondo con angoli arrotondati e fascia colorata in alto
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 0, 0, W, H, 40);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, W, H, 40);
    ctx.clip();
    ctx.fillStyle = COLORS.primary;
    ctx.fillRect(0, 0, W, 110);
    ctx.restore();

    const pad = 48;

    // Intestazione: nome della biblioteca
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    fitText(ctx, libraryName, { weight: 700, size: 40, minSize: 24, maxWidth: W - pad * 2 });
    ctx.fillText(libraryName, pad, 56);

    // QR a sinistra, con margine bianco (quiet zone già inclusa nel canvas del QR)
    const qrSize = H - 110 - pad * 2 + 20;
    const qrX = pad - 10;
    const qrY = 110 + pad - 10;
    ctx.imageSmoothingEnabled = false; // moduli del QR netti
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Dati del titolare a destra
    const textX = qrX + qrSize + 36;
    const textW = W - textX - pad;
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText("TESSERA DELLA BIBLIOTECA", textX, 200, textW);

    ctx.fillStyle = COLORS.text;
    fitText(ctx, fullName, { weight: 700, size: 52, minSize: 28, maxWidth: textW });
    ctx.fillText(fullName, textX, 280, textW);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText("Numero tessera", textX, 380, textW);
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText(String(cardNumber), textX, 445, textW);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `400 22px ${FONT}`;
    ctx.fillText("Mostra il QR al banco prestiti.", textX, H - pad - 34, textW);
    ctx.fillText("Se la smarrisci, rinnovala dal tuo profilo.", textX, H - pad, textW);

    // Bordo sottile: in stampa fa da linea di taglio
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 3;
    roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 40);
    ctx.stroke();

    return canvas;
}

export function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("Impossibile generare l'immagine"));
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
        }, "image/png");
    });
}

/**
 * Stampa la tessera a grandezza reale (85,6 × 54 mm) da un iframe nascosto:
 * niente finestre popup (bloccate dai browser) e la pagina corrente non cambia.
 */
export function printCanvas(canvas, title) {
    return new Promise((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument;
        doc.title = title; // il titolo finisce nell'intestazione di stampa e nel nome del PDF
        const style = doc.createElement("style");
        style.textContent = `
            @page { size: A4; margin: 15mm; }
            html, body { margin: 0; }
            img { width: ${CARD_MM.width}mm; height: ${CARD_MM.height}mm; display: block; }
        `;
        doc.head.appendChild(style);

        const img = doc.createElement("img");
        img.alt = title;
        img.onload = () => {
            const win = iframe.contentWindow;
            const cleanup = () => { iframe.remove(); resolve(); };
            win.addEventListener("afterprint", cleanup, { once: true });
            win.focus();
            win.print();
            // Alcuni browser non emettono afterprint: rimuovo comunque l'iframe più tardi
            setTimeout(cleanup, 60_000);
        };
        img.src = canvas.toDataURL("image/png");
        doc.body.appendChild(img);
    });
}
