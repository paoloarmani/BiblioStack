import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label.jsx";
import { Input } from "@/components/ui/input.jsx";
import api from "@/api/axios.js";

const DEBOUNCE_MS = 250;

// Campo per i soggetti di un'opera: etichette rimovibili + suggerimenti dai soggetti esistenti.
// value/onChange lavorano con i NOMI: quelli nuovi vengono creati dal backend al salvataggio.
export default function SubjectsField({ value = [], onChange, error }) {
    const [text, setText] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const debounceRef = useRef(null);

    const has = (name) => value.some(v => v.toLowerCase() === name.trim().toLowerCase());

    useEffect(() => {
        clearTimeout(debounceRef.current);
        const term = text.trim();
        if (!term) return; // i suggerimenti vengono svuotati in onTextChange
        debounceRef.current = setTimeout(async () => {
            try {
                const { data } = await api.get("/subjects/search", { params: { search: term, limit: 8 } });
                setSuggestions(data.data);
                setHighlight(-1);
            } catch {
                setSuggestions([]);
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounceRef.current);
    }, [text]);

    const add = (name) => {
        const clean = name.trim().replace(/\s+/g, " ");
        if (clean && !has(clean)) onChange([...value, clean]);
        setText("");
        setSuggestions([]);
        setHighlight(-1);
    };

    const remove = (name) => onChange(value.filter(v => v !== name));

    const visible = suggestions.filter(s => !has(s.name));
    const exact = visible.some(s => s.name.toLowerCase() === text.trim().toLowerCase());

    const onKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight(h => Math.min(h + 1, visible.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight(h => Math.max(h - 1, -1));
        } else if (e.key === "Enter") {
            // Invio non deve inviare il form: aggiunge il suggerimento evidenziato o il testo digitato
            e.preventDefault();
            if (highlight >= 0 && visible[highlight]) add(visible[highlight].name);
            else if (text.trim()) add(text);
        } else if (e.key === "Backspace" && !text && value.length > 0) {
            remove(value[value.length - 1]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    return (
        <div className="space-y-1.5">
            <Label htmlFor="subjects-input">Soggetti</Label>
            <p className="text-xs text-muted-foreground">
                Argomenti trattati (es. Urbanistica, Trentino). Invio per aggiungere; i soggetti nuovi vengono creati.
            </p>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map(name => (
                        <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-sm"
                        >
                            {name}
                            <button
                                type="button"
                                onClick={() => remove(name)}
                                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                aria-label={`Rimuovi ${name}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <Input
                    id="subjects-input"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (!e.target.value.trim()) setSuggestions([]);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="Cerca o aggiungi un soggetto..."
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open && (visible.length > 0 || !!text.trim())}
                    aria-controls="subjects-suggestions"
                />
                {open && text.trim() && (
                    <ul
                        id="subjects-suggestions"
                        role="listbox"
                        className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
                    >
                        {visible.map((s, i) => (
                            <li
                                key={s.id}
                                role="option"
                                aria-selected={i === highlight}
                                onMouseDown={(e) => { e.preventDefault(); add(s.name); }}
                                className={`cursor-pointer rounded px-2 py-1.5 ${i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent"}`}
                            >
                                {s.name}
                            </li>
                        ))}
                        {!exact && !has(text) && (
                            <li
                                role="option"
                                aria-selected={false}
                                onMouseDown={(e) => { e.preventDefault(); add(text); }}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-muted-foreground hover:bg-accent"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Crea «{text.trim()}»
                            </li>
                        )}
                    </ul>
                )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
