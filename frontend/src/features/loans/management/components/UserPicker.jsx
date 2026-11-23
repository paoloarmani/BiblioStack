import { useEffect, useRef, useState } from "react";
import { Loader2, QrCode, Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import api from "@/api/axios.js";
import { useCardVerification } from "@/features/qrCode/hooks/useCardVerification.js";
import CodeScannerDialog from "@/features/qrCode/CodeScannerDialog.jsx";

const DEBOUNCE_MS = 250;

// Scelta dell'utente a cui prestare un libro: ricerca per nome, cognome, email o numero tessera,
// oppure scansione del QR della tessera. value = utente selezionato ({ id, firstName, lastName, email }) o null.
export default function UserPicker({ value, onChange, error }) {
    const [text, setText] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const [scannerOpen, setScannerOpen] = useState(false);
    const debounceRef = useRef(null);
    const { verify } = useCardVerification();

    useEffect(() => {
        clearTimeout(debounceRef.current);
        const term = text.trim();
        if (!term) return; // la lista viene svuotata in onChange dell'input
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await api.get("/users/search", { params: { search: term, limit: 8 } });
                setResults(data);
                setHighlight(data.length ? 0 : -1);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [text]);

    const select = (user) => {
        onChange(user);
        setText("");
        setResults([]);
        setOpen(false);
    };

    const handleScan = async (rawToken) => {
        const result = await verify(rawToken);
        if (result?.valid && result?.userId) {
            try {
                const { data } = await api.get(`/users/${result.userId}`);
                select(data);
            } catch {
                select({ id: result.userId, firstName: "Tessera", lastName: `n. ${result.userId}`, email: "" });
            }
        }
    };

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); if (results[highlight]) select(results[highlight]); }
        else if (e.key === "Escape") setOpen(false);
    };

    if (value) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{value.firstName} {value.lastName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {value.email}{value.email ? " · " : ""}tessera n. {value.id}
                    </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                        onClick={() => onChange(null)} aria-label="Cambia utente">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            if (!e.target.value.trim()) setResults([]);
                            setOpen(true);
                        }}
                        onKeyDown={onKeyDown}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        placeholder="Nome, cognome, email o n. tessera"
                        className="pl-8"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={open && results.length > 0}
                        aria-controls="user-picker-results"
                        aria-invalid={!!error}
                    />
                    {loading && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    {open && text.trim() && !loading && (
                        <ul id="user-picker-results" role="listbox"
                            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md">
                            {results.length === 0 && (
                                <li className="px-2 py-1.5 text-muted-foreground">Nessun utente trovato</li>
                            )}
                            {results.map((u, i) => (
                                <li key={u.id} role="option" aria-selected={i === highlight}
                                    onMouseDown={(e) => { e.preventDefault(); select(u); }}
                                    className={`cursor-pointer rounded px-2 py-1.5 ${i === highlight ? "bg-primary/10 text-foreground" : "hover:bg-secondary"}`}>
                                    <span className="font-medium">{u.firstName} {u.lastName}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{u.email} · tessera n. {u.id}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <Button type="button" variant="outline" size="icon" className="shrink-0"
                        onClick={() => setScannerOpen(true)} aria-label="Scansiona tessera">
                    <QrCode className="h-4 w-4" />
                </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <CodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} type="qr" />
        </div>
    );
}
